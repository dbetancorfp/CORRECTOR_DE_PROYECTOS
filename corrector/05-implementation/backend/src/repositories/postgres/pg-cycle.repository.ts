import type { Cycle, CycleFilters, CycleRepository } from '../cycle.repository';
import type { SqlExecutor } from '../../db/sql-executor';

class PgRepositoryError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export class PgCycleRepository implements CycleRepository {
  constructor(private readonly sql: SqlExecutor) {}

  async findAll(filters: CycleFilters = {}): Promise<Cycle[]> {
    const name = filters.name ?? null;
    const legislationId = filters.legislationId ?? null;
    const year = filters.year ?? null;
    return this.sql<Cycle[]>`
      SELECT id, name
      FROM cycle
      WHERE (${name}::text IS NULL OR name ILIKE '%' || ${name} || '%')
        AND (
          ${legislationId}::int IS NULL
          OR id IN (SELECT cycle_id FROM module WHERE legislation_id = ${legislationId})
        )
        AND (
          ${year}::smallint IS NULL
          OR id IN (
            SELECT m.cycle_id
            FROM module m
            JOIN legislation l ON l.id = m.legislation_id
            WHERE l.start_year = ${year}
          )
        )
      ORDER BY id
    `;
  }

  async findById(id: number): Promise<Cycle | null> {
    const rows = await this.sql<Cycle[]>`
      SELECT id, name FROM cycle WHERE id = ${id}
    `;
    return rows[0] ?? null;
  }

  async findByName(name: string): Promise<Cycle | null> {
    const rows = await this.sql<Cycle[]>`
      SELECT id, name FROM cycle WHERE name = ${name}
    `;
    return rows[0] ?? null;
  }

  async create(name: string): Promise<Cycle> {
    const rows = await this.sql<Cycle[]>`
      INSERT INTO cycle (name) VALUES (${name})
      RETURNING id, name
    `;
    return rows[0]!;
  }

  async update(id: number, name: string): Promise<Cycle> {
    const rows = await this.sql<Cycle[]>`
      UPDATE cycle SET name = ${name}
      WHERE id = ${id}
      RETURNING id, name
    `;
    const updated = rows[0];
    if (!updated) {
      throw new PgRepositoryError(`Cycle ${id} not found`, 'NOT_FOUND');
    }
    return updated;
  }

  async delete(id: number): Promise<void> {
    const rows = await this.sql<{ id: number }[]>`
      DELETE FROM cycle WHERE id = ${id}
      RETURNING id
    `;
    if (rows.length === 0) {
      throw new PgRepositoryError(`Cycle ${id} not found`, 'NOT_FOUND');
    }
  }

  async hasModules(id: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM module WHERE cycle_id = ${id}) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }
}
