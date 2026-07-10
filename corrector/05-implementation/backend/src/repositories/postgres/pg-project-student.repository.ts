import type {
  AssignResult,
  ProjectStudentAssignment,
  ProjectStudentRepository,
  ProjectStudentSummary,
} from '../project-student.repository';
import type { SqlExecutor, TransactionalSqlExecutor } from '../../db/sql-executor';

class PgRepositoryError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

const YEAR_CONFLICT_MESSAGE = /already belongs to a project in academic year/;

export class PgProjectStudentRepository implements ProjectStudentRepository {
  constructor(private readonly sql: TransactionalSqlExecutor) {}

  async findByProject(projectId: number): Promise<ProjectStudentSummary[]> {
    return this.sql<ProjectStudentSummary[]>`
      SELECT ps.student_id AS "studentId", s.name
      FROM project_student ps
      JOIN student s ON s.id = ps.student_id
      WHERE ps.project_id = ${projectId}
      ORDER BY ps.student_id
    `;
  }

  async findAll(): Promise<ProjectStudentAssignment[]> {
    return this.sql<ProjectStudentAssignment[]>`
      SELECT ps.project_id AS "projectId", p.name AS "projectName",
             ps.student_id AS "studentId", s.name AS "studentName",
             m.name AS "moduleName"
      FROM project_student ps
      JOIN project p ON p.id = ps.project_id
      JOIN student s ON s.id = ps.student_id
      JOIN module m ON m.id = p.module_id
      ORDER BY ps.project_id, ps.student_id
    `;
  }

  async countStudentsInProject(projectId: number): Promise<number> {
    const rows = await this.sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM project_student WHERE project_id = ${projectId}
    `;
    return rows[0]?.count ?? 0;
  }

  async isStudentInProjectThisYear(studentId: number, projectId: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS (
        SELECT 1
        FROM project_student ps
        JOIN project p ON p.id = ps.project_id
        WHERE ps.student_id = ${studentId}
          AND ps.project_id <> ${projectId}
          AND p.academic_year = (SELECT academic_year FROM project WHERE id = ${projectId})
      ) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }

  async isAssigned(projectId: number, studentId: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(
        SELECT 1 FROM project_student WHERE project_id = ${projectId} AND student_id = ${studentId}
      ) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }

  async assign(projectId: number, studentIds: number[]): Promise<AssignResult> {
    // All-or-nothing: if any studentId in the batch conflicts, none of them
    // should end up assigned.
    const assigned = await this.sql.begin(async (tx: SqlExecutor) => {
      const result: number[] = [];
      for (const studentId of studentIds) {
        try {
          await tx`
            INSERT INTO project_student (project_id, student_id)
            VALUES (${projectId}, ${studentId})
            ON CONFLICT DO NOTHING
          `;
          result.push(studentId);
        } catch (err) {
          if (err instanceof Error && YEAR_CONFLICT_MESSAGE.test(err.message)) {
            throw new PgRepositoryError(
              `Student ${studentId} is already assigned to another project this academic year`,
              'YEAR_CONFLICT',
            );
          }
          throw err;
        }
      }
      return result;
    });
    const totalStudents = await this.countStudentsInProject(projectId);
    return { projectId, assigned, totalStudents };
  }

  async unassign(projectId: number, studentId: number): Promise<void> {
    await this.sql`
      DELETE FROM project_student WHERE project_id = ${projectId} AND student_id = ${studentId}
    `;
  }
}
