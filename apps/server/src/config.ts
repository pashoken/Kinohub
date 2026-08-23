import { z } from 'zod';

const optionalString = (schema: z.ZodString) =>
  z.preprocess((value) => value === '' ? undefined : value, schema.optional());
const optionalUrl = optionalString(z.string().url());

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().trim().min(1).default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4100),
  APP_MODE: z.enum(['mock', 'unconfigured', 'live']).default('mock'),
  PUBLIC_APP_ORIGIN: z.string().url().default('http://127.0.0.1:5173'),
  SEERR_URL: optionalUrl,
  SEERR_API_KEY: optionalString(z.string().min(1)),
  KINOPOISK_API_KEY: optionalString(z.string().uuid()),
  POISKKINO_API_KEY: optionalString(z.string().min(10)),
  JACKETT_URL: optionalUrl,
  PUBLIC_JACKETT_URL: optionalUrl,
  JACKETT_API_KEY: optionalString(z.string().min(1)),
  TORRSERVER_URL: optionalUrl,
  PUBLIC_TORRSERVER_URL: optionalUrl,
  JELLYFIN_URL: optionalUrl,
}).superRefine((config, context) => {
  if (config.APP_MODE !== 'live') return;
  for (const variable of [
    'SEERR_URL',
    'SEERR_API_KEY',
    'JACKETT_URL',
    'PUBLIC_JACKETT_URL',
    'JACKETT_API_KEY',
    'TORRSERVER_URL',
    'PUBLIC_TORRSERVER_URL',
  ] as const) {
    if (!config[variable]) {
      context.addIssue({
        code: 'custom',
        path: [variable],
        message: `${variable} is required in live mode`,
      });
    }
  }
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
