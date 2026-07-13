// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { createPgClient, redactDatabaseUrl } from '../src/db/pg-client';

describe('db/pg-client — createPgClient', () => {
  it('creates a client without connecting eagerly', () => {
    const client = createPgClient('postgres://user:pass@localhost:5432/nonexistent_db');
    expect(client).toBeDefined();
  });
});

describe('db/pg-client — redactDatabaseUrl', () => {
  it('replaces the password with a placeholder', () => {
    const redacted = redactDatabaseUrl('postgres://user:secretpass@localhost:5432/mydb');
    expect(redacted).not.toContain('secretpass');
    expect(redacted).toContain('***');
  });

  it('keeps the username, host, port and database name intact', () => {
    const redacted = redactDatabaseUrl('postgres://user:secretpass@localhost:5432/mydb');
    expect(redacted).toContain('user');
    expect(redacted).toContain('localhost');
    expect(redacted).toContain('5432');
    expect(redacted).toContain('mydb');
  });

  it('returns a placeholder instead of throwing on an unparseable URL', () => {
    expect(redactDatabaseUrl('not-a-url')).toBe('***');
  });
});
