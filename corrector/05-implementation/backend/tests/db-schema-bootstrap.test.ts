// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { applySchema, type SchemaSqlClient } from '../src/db/schema-bootstrap';

function makeFakeSql(): SchemaSqlClient & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    unsafe: async (query: string) => {
      calls.push(`unsafe:${query}`);
    },
    file: async (path: string) => {
      calls.push(`file:${path}`);
    },
  };
}

describe('db/schema-bootstrap — applySchema', () => {
  it('applies the schema file without resetting when reset=false', async () => {
    const sql = makeFakeSql();
    await applySchema(sql, { reset: false });
    expect(sql.calls.length).toBe(1);
    expect(sql.calls[0]).toMatch(/^file:.*schema\.sql$/);
  });

  it('drops and recreates the public schema before applying when reset=true', async () => {
    const sql = makeFakeSql();
    await applySchema(sql, { reset: true });
    expect(sql.calls.length).toBe(2);
    expect(sql.calls[0]).toContain('DROP SCHEMA public CASCADE');
    expect(sql.calls[1]).toMatch(/^file:.*schema\.sql$/);
  });
});
