import type {
  CreateProjectData,
  Project,
  ProjectFilters,
  ProjectRepository,
} from '../project.repository';
import type { SqlExecutor } from '../../db/sql-executor';

class PgRepositoryError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export class PgProjectRepository implements ProjectRepository {
  constructor(private readonly sql: SqlExecutor) {}

  async findAll(filters: ProjectFilters = {}): Promise<Project[]> {
    const name = filters.name ?? null;
    const academicYear = filters.academicYear ?? null;
    const moduleId = filters.moduleId ?? null;
    const legislationId = filters.legislationId ?? null;
    return this.sql<Project[]>`
      SELECT p.id, p.name, p.academic_year AS "academicYear",
             p.module_id AS "moduleId", m.name AS "moduleName", c.name AS "cycleName",
             (SELECT COUNT(*)::int FROM project_student ps WHERE ps.project_id = p.id) AS "studentCount"
      FROM project p
      JOIN module m ON m.id = p.module_id
      JOIN cycle c ON c.id = m.cycle_id
      WHERE (${name}::text IS NULL OR p.name ILIKE '%' || ${name} || '%')
        AND (${academicYear}::text IS NULL OR p.academic_year = ${academicYear})
        AND (${moduleId}::int IS NULL OR p.module_id = ${moduleId})
        AND (${legislationId}::int IS NULL OR m.legislation_id = ${legislationId})
      ORDER BY p.id
    `;
  }

  async findById(id: number): Promise<Project | null> {
    const rows = await this.sql<Project[]>`
      SELECT p.id, p.name, p.academic_year AS "academicYear",
             p.module_id AS "moduleId", m.name AS "moduleName", c.name AS "cycleName",
             (SELECT COUNT(*)::int FROM project_student ps WHERE ps.project_id = p.id) AS "studentCount"
      FROM project p
      JOIN module m ON m.id = p.module_id
      JOIN cycle c ON c.id = m.cycle_id
      WHERE p.id = ${id}
    `;
    return rows[0] ?? null;
  }

  async create(data: CreateProjectData): Promise<Project> {
    const rows = await this.sql<{ id: number }[]>`
      INSERT INTO project (name, academic_year, module_id)
      VALUES (${data.name}, ${data.academicYear}, ${data.moduleId})
      RETURNING id
    `;
    const created = await this.findById(rows[0]!.id);
    return created!;
  }

  async update(id: number, data: Partial<CreateProjectData>): Promise<Project> {
    const name = data.name ?? null;
    const academicYear = data.academicYear ?? null;
    const rows = await this.sql<{ id: number }[]>`
      UPDATE project
      SET name = COALESCE(${name}, name),
          academic_year = COALESCE(${academicYear}, academic_year)
      WHERE id = ${id}
      RETURNING id
    `;
    if (rows.length === 0) {
      throw new PgRepositoryError(`Project ${id} not found`, 'NOT_FOUND');
    }
    const updated = await this.findById(id);
    return updated!;
  }

  async delete(id: number): Promise<void> {
    const rows = await this.sql<{ id: number }[]>`
      DELETE FROM project WHERE id = ${id}
      RETURNING id
    `;
    if (rows.length === 0) {
      throw new PgRepositoryError(`Project ${id} not found`, 'NOT_FOUND');
    }
  }

  async hasStudents(id: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM project_student WHERE project_id = ${id}) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }
}
