import { config } from 'dotenv';
import { createPgClient } from '../src/db/pg-client';
import { applySchema } from '../src/db/schema-bootstrap';
import { seedFixture } from './seed-fixture';

config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run db:seed:e2e');
}

const sql = createPgClient(databaseUrl);

await applySchema(sql, { reset: true });
await seedFixture(sql);
await sql.end();

console.log(`Fixture seeded to ${databaseUrl} — ready for Cypress (no pre-seeded sessions; log in through the UI).`);
