export type IntegrationErrorCode =
  | 'NETWORK_ERROR'
  | 'UPSTREAM_TIMEOUT'
  | 'UPSTREAM_HTTP_ERROR'
  | 'UPSTREAM_BODY_TOO_LARGE'
  | 'UPSTREAM_INVALID_JSON'
  | 'UPSTREAM_INVALID_XML'
  | 'INTEGRATION_UNCONFIGURED';

export class IntegrationError extends Error {
  constructor(public readonly code: IntegrationErrorCode, message: string, public readonly retryable = false) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export function normalizeNetworkError(error: unknown): IntegrationError {
  if (error instanceof IntegrationError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new IntegrationError('UPSTREAM_TIMEOUT', 'Сервис не ответил вовремя', true);
  }
  return new IntegrationError('NETWORK_ERROR', 'Не удалось подключиться к сервису', true);
}
