import type {
  CreateModuleData,
  Module,
  ModuleFilters,
  ModuleRepository,
} from '../module.repository';
import type { SqlExecutor } from '../../db/sql-executor';

class PgRepositoryError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export class PgModuleRepository implements ModuleRepository {
  constructor(private readonly sql: SqlExecutor) {}

  async findAll(filters: ModuleFilters = {}): Promise<Module[]> {
    const name = filters.name ?? null;
    const cycleId = filters.cycleId ?? null;
    const legislationId = filters.legislationId ?? null;
    const year = filters.year ?? null;
    const teacherId = filters.teacherId ?? null;
    return this.sql<Module[]>`
      SELECT m.id, m.name, m.weekly_hours AS "weeklyHours",
             m.cycle_id AS "cycleId", c.name AS "cycleName",
             m.legislation_id AS "legislationId", l.name AS "legislationName"
      FROM module m
      JOIN cycle c ON c.id = m.cycle_id
      JOIN legislation l ON l.id = m.legislation_id
      WHERE (${name}::text IS NULL OR m.name ILIKE '%' || ${name} || '%')
        AND (${cycleId}::int IS NULL OR m.cycle_id = ${cycleId})
        AND (${legislationId}::int IS NULL OR m.legislation_id = ${legislationId})
        AND (${year}::smallint IS NULL OR l.start_year = ${year})
        AND (
          ${teacherId}::int IS NULL
          OR EXISTS (
            SELECT 1 FROM teacher_module tm
            WHERE tm.module_id = m.id AND tm.teacher_id = ${teacherId}
          )
        )
      ORDER BY m.id
    `;
  }

  async findById(id: number): Promise<Module | null> {
    const rows = await this.sql<Module[]>`
      SELECT m.id, m.name, m.weekly_hours AS "weeklyHours",
             m.cycle_id AS "cycleId", c.name AS "cycleName",
             m.legislation_id AS "legislationId", l.name AS "legislationName"
      FROM module m
      JOIN cycle c ON c.id = m.cycle_id
      JOIN legislation l ON l.id = m.legislation_id
      WHERE m.id = ${id}
    `;
    return rows[0] ?? null;
  }

  async findByNameAndCycle(name: string, cycleId: number, legislationId: number): Promise<Module | null> {
    const rows = await this.sql<Module[]>`
      SELECT m.id, m.name, m.weekly_hours AS "weeklyHours",
             m.cycle_id AS "cycleId", c.name AS "cycleName",
             m.legislation_id AS "legislationId", l.name AS "legislationName"
      FROM module m
      JOIN cycle c ON c.id = m.cycle_id
      JOIN legislation l ON l.id = m.legislation_id
      WHERE m.name = ${name} AND m.cycle_id = ${cycleId} AND m.legislation_id = ${legislationId}
    `;
    return rows[0] ?? null;
  }

  async create(data: CreateModuleData): Promise<Module> {
    const rows = await this.sql<Module[]>`
      WITH inserted AS (
        INSERT INTO module (name, weekly_hours, cycle_id, legislation_id)
        VALUES (${data.name}, ${data.weeklyHours}, ${data.cycleId}, ${data.legislationId})
        RETURNING id, name, weekly_hours, cycle_id, legislation_id
      )
      SELECT i.id, i.name, i.weekly_hours AS "weeklyHours",
             i.cycle_id AS "cycleId", c.name AS "cycleName",
             i.legislation_id AS "legislationId", l.name AS "legislationName"
      FROM inserted i
      JOIN cycle c ON c.id = i.cycle_id
      JOIN legislation l ON l.id = i.legislation_id
    `;
    return rows[0]!;
  }

  async update(id: number, data: Partial<CreateModuleData>): Promise<Module> {
    const name = data.name ?? null;
    const weeklyHours = data.weeklyHours ?? null;
    const rows = await this.sql<Module[]>`
      WITH updated AS (
        UPDATE module
        SET name = COALESCE(${name}, name),
            weekly_hours = COALESCE(${weeklyHours}, weekly_hours)
        WHERE id = ${id}
        RETURNING id, name, weekly_hours, cycle_id, legislation_id
      )
      SELECT u.id, u.name, u.weekly_hours AS "weeklyHours",
             u.cycle_id AS "cycleId", c.name AS "cycleName",
             u.legislation_id AS "legislationId", l.name AS "legislationName"
      FROM updated u
      JOIN cycle c ON c.id = u.cycle_id
      JOIN legislation l ON l.id = u.legislation_id
    `;
    const updated = rows[0];
    if (!updated) {
      throw new PgRepositoryError(`Module ${id} not found`, 'NOT_FOUND');
    }
    return updated;
  }

  async delete(id: number): Promise<void> {
    // teacher_module.module_id is ON DELETE RESTRICT — clear assignments first,
    // mirroring InMemoryModuleRepository.delete()'s cascade behaviour.
    await this.sql`DELETE FROM teacher_module WHERE module_id = ${id}`;
    const rows = await this.sql<{ id: number }[]>`
      DELETE FROM module WHERE id = ${id}
      RETURNING id
    `;
    if (rows.length === 0) {
      throw new PgRepositoryError(`Module ${id} not found`, 'NOT_FOUND');
    }
  }

  async hasProjects(id: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM project WHERE module_id = ${id}) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }

  async hasRubric(id: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM rubric WHERE module_id = ${id}) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }

  async hasCorrections(id: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM correction WHERE module_id = ${id}) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }

  async isTeacherAssigned(teacherId: number, moduleId: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(
        SELECT 1 FROM teacher_module WHERE teacher_id = ${teacherId} AND module_id = ${moduleId}
      ) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }
}
