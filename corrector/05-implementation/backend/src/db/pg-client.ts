import { SQL } from 'bun';

export function createPgClient(databaseUrl: string): SQL {
  return new SQL(databaseUrl);
}
