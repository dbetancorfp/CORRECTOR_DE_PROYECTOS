import { config } from 'dotenv';
import { createPgClient } from '../src/db/pg-client';
import { applySchema } from '../src/db/schema-bootstrap';

config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run db:setup');
}

const reset = process.env.DB_RESET === 'true';
const sql = createPgClient(databaseUrl);

await applySchema(sql, { reset });

console.log(`Schema applied (reset=${reset}) to ${databaseUrl}`);
