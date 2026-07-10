// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { loadConfig } from '../src/db/env';

describe('db/env — loadConfig', () => {
  it('defaults to memory backend with port 3000 when env is empty', () => {
    const config = loadConfig({});
    expect(config.dataBackend).toBe('memory');
    expect(config.port).toBe(3000);
  });

  it('reads PORT from env', () => {
    const config = loadConfig({ PORT: '4000' });
    expect(config.port).toBe(4000);
  });

  it('returns postgres backend with databaseUrl when both are set', () => {
    const config = loadConfig({ DATA_BACKEND: 'postgres', DATABASE_URL: 'postgres://localhost/test' });
    expect(config.dataBackend).toBe('postgres');
    if (config.dataBackend === 'postgres') {
      expect(config.databaseUrl).toBe('postgres://localhost/test');
    }
  });

  it('throws when DATA_BACKEND=postgres but DATABASE_URL is missing', () => {
    expect(() => loadConfig({ DATA_BACKEND: 'postgres' })).toThrow();
  });

  it('throws on an unknown DATA_BACKEND value', () => {
    expect(() => loadConfig({ DATA_BACKEND: 'sqlite' })).toThrow();
  });
});
