export interface MemoryBackendConfig {
  dataBackend: 'memory';
  port: number;
}

export interface PostgresBackendConfig {
  dataBackend: 'postgres';
  databaseUrl: string;
  port: number;
}

export type AppConfig = MemoryBackendConfig | PostgresBackendConfig;

export function loadConfig(env: Record<string, string | undefined>): AppConfig {
  const port = env.PORT !== undefined ? Number(env.PORT) : 3000;
  const dataBackend = env.DATA_BACKEND ?? 'memory';

  if (dataBackend !== 'memory' && dataBackend !== 'postgres') {
    throw new Error(`Invalid DATA_BACKEND "${dataBackend}": expected "memory" or "postgres"`);
  }

  if (dataBackend === 'postgres') {
    const databaseUrl = env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is required when DATA_BACKEND=postgres');
    }
    return { dataBackend, databaseUrl, port };
  }

  return { dataBackend, port };
}
