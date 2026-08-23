import { describe, expect, it } from 'vitest';
import { buildApp } from './app.js';
import { ConfigError, parseConfig } from './config.js';

const config = parseConfig({ NODE_ENV: 'test', APP_MODE: 'mock' });

describe('mock API', () => {
  it('returns health and a normalized fixture catalog', async () => {
    const app = buildApp(config);
    const health = await app.inject({ method: 'GET', url: '/api/health' });
    const catalog = await app.inject({ method: 'GET', url: '/api/catalog' });
    expect(health.json()).toEqual({ status: 'ok', mode: 'mock' });
    expect(catalog.json().rails[0].movies[0].title).toBe('Космический рубеж');
    await app.close();
  });

});

describe('configuration', () => {
  it('accepts blank optional values from the public env template', () => {
    const parsed = parseConfig({
      SEERR_URL: '',
      SEERR_API_KEY: '',
      JACKETT_URL: '',
      JACKETT_API_KEY: '',
      TORRSERVER_URL: '',
    });
    expect(parsed.SEERR_URL).toBeUndefined();
    expect(parsed.JACKETT_API_KEY).toBeUndefined();
  });

  it('fails fast when a live deployment is incomplete', () => {
    expect(() => parseConfig({ APP_MODE: 'live' })).toThrow('SEERR_URL');
  });

  it('names an invalid variable without revealing its value', () => {
    expect(() => parseConfig({ PORT: 'very-secret-invalid-value' })).toThrow(ConfigError);
    try {
      parseConfig({ PORT: 'very-secret-invalid-value' });
    } catch (error) {
      expect((error as Error).message).toContain('PORT');
      expect((error as Error).message).not.toContain('very-secret-invalid-value');
    }
  });
});
