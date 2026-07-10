// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { createPgClient } from '../src/db/pg-client';

describe('db/pg-client — createPgClient', () => {
  it('creates a client without connecting eagerly', () => {
    const client = createPgClient('postgres://user:pass@localhost:5432/nonexistent_db');
    expect(client).toBeDefined();
  });
});
