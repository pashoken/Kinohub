import { IntegrationError, normalizeNetworkError } from './errors.js';

export type HttpPolicy = {
  timeoutMs?: number;
  maxBytes?: number;
  retries?: number;
  fetchImpl?: typeof fetch;
};

export async function requestText(url: URL, init: RequestInit, policy: HttpPolicy = {}): Promise<string> {
  const timeoutMs = policy.timeoutMs ?? 5_000;
  const maxBytes = policy.maxBytes ?? 1_000_000;
  const retries = init.method === undefined || init.method === 'GET' ? (policy.retries ?? 1) : 0;
  const fetchImpl = policy.fetchImpl ?? fetch;
  let lastError: IntegrationError | undefined;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { ...init, signal: controller.signal });
      if (!response.ok) {
        throw new IntegrationError('UPSTREAM_HTTP_ERROR', `Сервис вернул HTTP ${response.status}`, response.status >= 500);
      }
      const declaredLength = Number(response.headers.get('content-length') ?? 0);
      if (declaredLength > maxBytes) {
        throw new IntegrationError('UPSTREAM_BODY_TOO_LARGE', 'Ответ сервиса превышает допустимый размер');
      }
      const text = await response.text();
      if (new TextEncoder().encode(text).byteLength > maxBytes) {
        throw new IntegrationError('UPSTREAM_BODY_TOO_LARGE', 'Ответ сервиса превышает допустимый размер');
      }
      return text;
    } catch (error) {
      lastError = normalizeNetworkError(error);
      if (!lastError.retryable || attempt === retries) throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError ?? new IntegrationError('NETWORK_ERROR', 'Неизвестная ошибка сети');
}

export async function requestJson<T>(url: URL, init: RequestInit, policy: HttpPolicy = {}): Promise<T> {
  const text = await requestText(url, init, policy);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new IntegrationError('UPSTREAM_INVALID_JSON', 'Сервис вернул некорректный JSON');
  }
}
