import { config } from 'dotenv';
import { createPgClient } from '../src/db/pg-client';
import { applySchema } from '../src/db/schema-bootstrap';
import { createApp } from '../src/app';
import { seedFixture } from '../scripts/seed-fixture';
import type { SessionMap } from '../src/repositories/in-memory/in-memory-session.repository';

config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required to run the test suite — integration tests run against a real Postgres 16 instance, not an in-memory fake.',
  );
}

const sql = createPgClient(databaseUrl);

await applySchema(sql, { reset: true });
await seedFixture(sql);

// Pre-seeded sessions for integration tests
const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
const sessions: SessionMap = new Map([
  ['admin-session', { teacherId: 7, expiresAt: futureExpiry }],
  ['tutor-session', { teacherId: 3, expiresAt: futureExpiry }],
  ['profesor-session', { teacherId: 2, expiresAt: futureExpiry }],
  ['other-teacher-session', { teacherId: 5, expiresAt: futureExpiry }],
]);

const app = createApp({ backend: 'postgres', sql, sessions });
app.listen(3456);
