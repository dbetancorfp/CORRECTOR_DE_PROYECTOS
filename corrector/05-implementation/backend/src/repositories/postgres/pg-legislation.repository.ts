import type {
  Legislation,
  LegislationFilters,
  LegislationRepository,
} from '../legislation.repository';
import type { SqlExecutor } from '../../db/sql-executor';
import { assertFound, assertRowsAffected } from './pg-repository-error';

export class PgLegislationRepository implements LegislationRepository {
  constructor(private readonly sql: SqlExecutor) {}

  async findAll(filters: LegislationFilters = {}): Promise<Legislation[]> {
    const year = filters.year ?? null;
    const name = filters.name ?? null;
    return this.sql<Legislation[]>`
      SELECT id, name, start_year AS "startYear"
      FROM legislation
      WHERE (${year}::smallint IS NULL OR start_year = ${year})
        AND (${name}::text IS NULL OR name ILIKE '%' || ${name} || '%')
      ORDER BY id
    `;
  }

  async findById(id: number): Promise<Legislation | null> {
    const rows = await this.sql<Legislation[]>`
      SELECT id, name, start_year AS "startYear"
      FROM legislation
      WHERE id = ${id}
    `;
    return rows[0] ?? null;
  }

  async findByName(name: string): Promise<Legislation | null> {
    const rows = await this.sql<Legislation[]>`
      SELECT id, name, start_year AS "startYear"
      FROM legislation
      WHERE name = ${name}
    `;
    return rows[0] ?? null;
  }

  async create(name: string, startYear: number): Promise<Legislation> {
    const rows = await this.sql<Legislation[]>`
      INSERT INTO legislation (name, start_year)
      VALUES (${name}, ${startYear})
      RETURNING id, name, start_year AS "startYear"
    `;
    return rows[0]!;
  }

  async update(id: number, data: Partial<{ name: string; startYear: number }>): Promise<Legislation> {
    const name = data.name ?? null;
    const startYear = data.startYear ?? null;
    const rows = await this.sql<Legislation[]>`
      UPDATE legislation
      SET name = COALESCE(${name}, name),
          start_year = COALESCE(${startYear}, start_year)
      WHERE id = ${id}
      RETURNING id, name, start_year AS "startYear"
    `;
    return assertFound(rows[0], `Legislation ${id} not found`);
  }

  async delete(id: number): Promise<void> {
    const rows = await this.sql<{ id: number }[]>`
      DELETE FROM legislation
      WHERE id = ${id}
      RETURNING id
    `;
    assertRowsAffected(rows.length, `Legislation ${id} not found`);
  }

  async hasModules(id: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM module WHERE legislation_id = ${id}) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }
}
