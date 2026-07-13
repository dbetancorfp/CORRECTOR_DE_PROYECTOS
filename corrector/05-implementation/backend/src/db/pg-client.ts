import { SQL } from 'bun';

export function createPgClient(databaseUrl: string): SQL {
  return new SQL(databaseUrl);
}

// Postgres connection strings carry a plaintext password — never log one
// verbatim (setup/seed scripts print this URL to confirm which DB they
// targeted, and the password must not end up in CI logs).
export function redactDatabaseUrl(databaseUrl: string): string {
  try {
    const url = new URL(databaseUrl);
    if (url.password) url.password = '***';
    return url.toString();
  } catch {
    return '***';
  }
}
