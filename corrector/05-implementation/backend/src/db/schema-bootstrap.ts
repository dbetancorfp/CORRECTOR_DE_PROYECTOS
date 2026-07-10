import { join } from 'node:path';

export interface SchemaSqlClient {
  unsafe(query: string): Promise<unknown>;
  file(path: string): Promise<unknown>;
}

export interface ApplySchemaOptions {
  reset: boolean;
}

const SCHEMA_PATH = join(import.meta.dir, '..', '..', 'schema.sql');

export async function applySchema(sql: SchemaSqlClient, options: ApplySchemaOptions): Promise<void> {
  if (options.reset) {
    await sql.unsafe('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  }
  await sql.file(SCHEMA_PATH);
}
