import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.ipv4().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  APP_MODE: z.enum(['mock', 'unconfigured', 'live']).default('mock'),
  PUBLIC_APP_ORIGIN: z.string().url().default('http://127.0.0.1:5173'),
  SEERR_URL: z.string().url().optional(),
  SEERR_API_KEY: z.string().min(1).optional(),
  SEERR_SERVER_ID: z.coerce.number().int().positive().default(1),
  SEERR_PROFILE_ID: z.coerce.number().int().positive().default(1),
  KINOPOISK_API_KEY: z.string().uuid().optional(),
  JACKETT_URL: z.string().url().optional(),
  PUBLIC_JACKETT_URL: z.string().url().optional(),
  JACKETT_API_KEY: z.string().min(1).optional(),
  TORRSERVER_URL: z.string().url().optional(),
  PUBLIC_TORRSERVER_URL: z.string().url().optional()
});

export type AppConfig = z.infer<typeof envSchema>;

export class ConfigError extends Error {
  constructor(public readonly variable: string) {
    super(`Некорректная переменная окружения: ${variable}`);
    this.name = 'ConfigError';
  }
}

export function parseConfig(input: NodeJS.ProcessEnv): AppConfig {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    const variable = String(result.error.issues[0]?.path[0] ?? 'UNKNOWN');
    throw new ConfigError(variable);
  }
  return result.data;
}
