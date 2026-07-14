import type {
  CreateStudentData,
  Student,
  StudentFilters,
  StudentRepository,
} from '../student.repository';
import type { SqlExecutor } from '../../db/sql-executor';
import { assertRowsAffected } from './pg-repository-error';

export class PgStudentRepository implements StudentRepository {
  constructor(private readonly sql: SqlExecutor) {}

  async findAll(filters: StudentFilters = {}): Promise<Student[]> {
    const name = filters.name ?? null;
    const cycleId = filters.cycleId ?? null;
    const moduleId = filters.moduleId ?? null;
    return this.sql<Student[]>`
      SELECT s.id, s.name, s.cycle_id AS "cycleId", c.name AS "cycleName",
             COALESCE(
               (SELECT json_agg(json_build_object('id', m.id, 'name', m.name) ORDER BY m.id)
                FROM student_module sm
                JOIN module m ON m.id = sm.module_id
                WHERE sm.student_id = s.id),
               '[]'::json
             ) AS modules
      FROM student s
      JOIN cycle c ON c.id = s.cycle_id
      WHERE (${name}::text IS NULL OR s.name ILIKE '%' || ${name} || '%')
        AND (${cycleId}::int IS NULL OR s.cycle_id = ${cycleId})
        AND (
          ${moduleId}::int IS NULL
          OR EXISTS (
            SELECT 1 FROM student_module sm WHERE sm.student_id = s.id AND sm.module_id = ${moduleId}
          )
        )
      ORDER BY s.id
    `;
  }

  async findById(id: number): Promise<Student | null> {
    const rows = await this.sql<Student[]>`
      SELECT s.id, s.name, s.cycle_id AS "cycleId", c.name AS "cycleName",
             COALESCE(
               (SELECT json_agg(json_build_object('id', m.id, 'name', m.name) ORDER BY m.id)
                FROM student_module sm
                JOIN module m ON m.id = sm.module_id
                WHERE sm.student_id = s.id),
               '[]'::json
             ) AS modules
      FROM student s
      JOIN cycle c ON c.id = s.cycle_id
      WHERE s.id = ${id}
    `;
    return rows[0] ?? null;
  }

  async create(data: CreateStudentData): Promise<Student> {
    const rows = await this.sql<{ id: number }[]>`
      INSERT INTO student (name, cycle_id) VALUES (${data.name}, ${data.cycleId})
      RETURNING id
    `;
    const id = rows[0]!.id;
    try {
      await this.sql`
        INSERT INTO student_module (student_id, module_id) VALUES (${id}, ${data.moduleId})
      `;
    } catch (err) {
      // Roll back the just-created student so a failed enrollment doesn't leave an orphan.
      await this.sql`DELETE FROM student WHERE id = ${id}`;
      throw err;
    }
    const created = await this.findById(id);
    return created!;
  }

  async update(id: number, data: Partial<CreateStudentData>): Promise<Student> {
    const name = data.name ?? null;
    const cycleId = data.cycleId ?? null;
    const rows = await this.sql<{ id: number }[]>`
      UPDATE student
      SET name = COALESCE(${name}, name),
          cycle_id = COALESCE(${cycleId}, cycle_id)
      WHERE id = ${id}
      RETURNING id
    `;
    assertRowsAffected(rows.length, `Student ${id} not found`);
    const updated = await this.findById(id);
    return updated!;
  }

  async delete(id: number): Promise<void> {
    const rows = await this.sql<{ id: number }[]>`
      DELETE FROM student WHERE id = ${id}
      RETURNING id
    `;
    assertRowsAffected(rows.length, `Student ${id} not found`);
  }

  async isAssignedToProject(id: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM project_student WHERE student_id = ${id}) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }

  async hasCorrections(id: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM correction WHERE student_id = ${id}) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }
}
