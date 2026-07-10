import { config } from 'dotenv';
import { createStore } from './repositories/in-memory/store';
import { createApp } from './app';
import type { AppDeps } from './app';
import { loadConfig } from './db/env';
import { createPgClient } from './db/pg-client';

config();

const appConfig = loadConfig(process.env);

const sql = appConfig.dataBackend === 'postgres' ? createPgClient(appConfig.databaseUrl) : null;
const deps: AppDeps = sql !== null
  ? { backend: 'postgres', sql }
  : { backend: 'memory', store: createStore() };

const app = createApp(deps);

const server = app.listen(appConfig.port, () => {
  console.log(`Server running on port ${appConfig.port} (DATA_BACKEND=${appConfig.dataBackend})`);
});

async function shutdown(): Promise<void> {
  server.close();
  if (sql !== null) await sql.end();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
