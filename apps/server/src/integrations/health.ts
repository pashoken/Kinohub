import type { AppConfig } from "../config.js";

export type IntegrationName =
  "seerr" | "radarr" | "jackett" | "torrserver" | "jellyfin";
export type IntegrationDiagnostic = {
  service: IntegrationName;
  mode: AppConfig["APP_MODE"];
  status: "ready" | "mock" | "missing";
  remediation: string;
};

const envByService: Record<IntegrationName, string> = {
  seerr: "SEERR_URL",
  radarr: "RADARR_URL",
  jackett: "JACKETT_URL",
  torrserver: "TORRSERVER_URL",
  jellyfin: "JELLYFIN_URL",
};

export function integrationDiagnostics(
  config: AppConfig,
): IntegrationDiagnostic[] {
  return (Object.keys(envByService) as IntegrationName[]).map((service) => {
    if (config.APP_MODE === "mock")
      return {
        service,
        mode: "mock",
        status: "mock",
        remediation: "Используется безопасная тестовая интеграция",
      };
    const configured = Boolean(config[envByService[service] as keyof AppConfig]);
    return {
      service,
      mode: config.APP_MODE,
      status: configured ? "ready" : "missing",
      remediation: configured
        ? "Подключение настроено"
        : `Укажите ${envByService[service]} на сервере`,
    };
  });
}

export function safeJellyfinLink(
  base: string | undefined,
  itemId: string,
): URL | null {
  if (!base) return null;
  const url = new URL(base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search
  )
    return null;
  url.pathname = "/web/index.html";
  url.hash = `!/details?id=${encodeURIComponent(itemId)}`;
  return url;
}
