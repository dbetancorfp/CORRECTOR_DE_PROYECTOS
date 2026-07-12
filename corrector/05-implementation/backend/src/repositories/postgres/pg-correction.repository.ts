import type {
  CorrectionFilters,
  CorrectionRepository,
  CorrectionResult,
  UpsertCorrectionData,
} from '../correction.repository';
import type { TransactionalSqlExecutor } from '../../db/sql-executor';

// SqlExecutor only exposes the tagged-template call signature (see
// sql-executor.ts) — no `.unsafe()` for splicing a raw SQL fragment into a
// `${}` interpolation. Bun's SQL client treats every `${}` value as a bound
// parameter, so a previous version of this file that interpolated a shared
// ITEMS_SUBQUERY string constant silently sent it as a literal text
// parameter instead of embedding it as SQL — `items` in the response was
// the subquery's own source text, not the computed JSON array. The
// subquery is static (no user input), so it's duplicated inline in both
// queries below rather than reintroducing that bug for the sake of DRY.
//
// Also cast final_score::float8 — it's NUMERIC(4,2) in schema.sql, and
// Bun's SQL client returns NUMERIC as a string (precision preservation),
// not a JS number, even though CorrectionResult.finalScore is typed
// `number`. Same pattern already used for the SUM(...) in
// pg-rubric.repository.ts.
export class PgCorrectionRepository implements CorrectionRepository {
  constructor(private readonly sql: TransactionalSqlExecutor) {}

  async findAll(filters: CorrectionFilters = {}): Promise<CorrectionResult[]> {
    const moduleId = filters.moduleId ?? null;
    const academicYear = filters.academicYear ?? null;
    return this.sql<CorrectionResult[]>`
      SELECT c.id, c.student_id AS "studentId", ps.project_id AS "projectId",
             c.module_id AS "moduleId", c.rubric_id AS "rubricId",
             c.academic_year AS "academicYear", c.final_score::float8 AS "finalScore",
             COALESCE(
               (SELECT json_agg(json_build_object('rubricItemId', ci.rubric_item_id, 'rubricLevelId', ci.rubric_level_id))
                FROM correction_item ci
                WHERE ci.correction_id = c.id),
               '[]'::json
             ) AS items
      FROM correction c
      JOIN project_student ps ON ps.student_id = c.student_id
      JOIN project p ON p.id = ps.project_id AND p.academic_year = c.academic_year
      WHERE (${moduleId}::int IS NULL OR c.module_id = ${moduleId})
        AND (${academicYear}::text IS NULL OR c.academic_year = ${academicYear})
      ORDER BY c.id
    `;
  }

  async findByStudentAndProject(studentId: number, projectId: number): Promise<CorrectionResult | null> {
    const rows = await this.sql<CorrectionResult[]>`
      SELECT c.id, c.student_id AS "studentId", ${projectId}::int AS "projectId",
             c.module_id AS "moduleId", c.rubric_id AS "rubricId",
             c.academic_year AS "academicYear", c.final_score::float8 AS "finalScore",
             COALESCE(
               (SELECT json_agg(json_build_object('rubricItemId', ci.rubric_item_id, 'rubricLevelId', ci.rubric_level_id))
                FROM correction_item ci
                WHERE ci.correction_id = c.id),
               '[]'::json
             ) AS items
      FROM correction c
      JOIN project p ON p.module_id = c.module_id AND p.academic_year = c.academic_year
      JOIN project_student ps ON ps.project_id = p.id AND ps.student_id = c.student_id
      WHERE c.student_id = ${studentId} AND p.id = ${projectId}
    `;
    return rows[0] ?? null;
  }

  async upsert(data: UpsertCorrectionData): Promise<CorrectionResult> {
    const finalScore = data.finalScore ?? 0;
    return this.sql.begin(async (tx) => {
      const rows = await tx<{ id: number }[]>`
        INSERT INTO correction (student_id, module_id, rubric_id, teacher_id, academic_year, final_score)
        VALUES (${data.studentId}, ${data.moduleId}, ${data.rubricId}, ${data.teacherId}, ${data.academicYear}, ${finalScore})
        ON CONFLICT (student_id, module_id, academic_year)
        DO UPDATE SET final_score = EXCLUDED.final_score, teacher_id = EXCLUDED.teacher_id, updated_at = NOW()
        RETURNING id
      `;
      const correctionId = rows[0]!.id;
      await tx`DELETE FROM correction_item WHERE correction_id = ${correctionId}`;
      for (const item of data.items) {
        await tx`
          INSERT INTO correction_item (correction_id, rubric_item_id, rubric_level_id)
          VALUES (${correctionId}, ${item.rubricItemId}, ${item.rubricLevelId})
        `;
      }
      return {
        id: correctionId,
        studentId: data.studentId,
        projectId: data.projectId,
        moduleId: data.moduleId,
        rubricId: data.rubricId,
        academicYear: data.academicYear,
        finalScore,
        items: data.items,
      };
    });
  }
}
