import type {
  AddRubricItemData,
  RubricFull,
  RubricItemFull,
  RubricLevel,
  RubricRepository,
} from '../rubric.repository';
import type { SqlExecutor, TransactionalSqlExecutor } from '../../db/sql-executor';

class PgRepositoryError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

export class PgRubricRepository implements RubricRepository {
  constructor(private readonly sql: TransactionalSqlExecutor) {}

  async findByModule(moduleId: number, academicYear: string): Promise<RubricFull | null> {
    const rows = await this.sql<{ id: number; moduleId: number; academicYear: string }[]>`
      SELECT id, module_id AS "moduleId", academic_year AS "academicYear"
      FROM rubric
      WHERE module_id = ${moduleId} AND academic_year = ${academicYear}
    `;
    const rubric = rows[0];
    if (!rubric) return null;
    const items = await this._findItems(this.sql, rubric.id);
    return { ...rubric, frozen: false, items };
  }

  async addItem(moduleId: number, item: AddRubricItemData): Promise<RubricItemFull> {
    return this.sql.begin(async (tx) => {
      const rubricId = await this._findOrCreateRubric(tx, moduleId, item.academicYear);
      const rows = await tx<{ id: number }[]>`
        INSERT INTO rubric_item (rubric_id, description, display_order)
        VALUES (${rubricId}, ${item.description}, ${item.displayOrder})
        RETURNING id
      `;
      const itemId = rows[0]!.id;
      await this._insertLevels(tx, itemId, item.levels);
      const levels = await this._findLevels(tx, itemId);
      return { id: itemId, rubricId, description: item.description, displayOrder: item.displayOrder, levels };
    });
  }

  async updateItem(itemId: number, data: Partial<AddRubricItemData>): Promise<RubricItemFull> {
    return this.sql.begin(async (tx) => {
      const description = data.description ?? null;
      const rows = await tx<
        { id: number; rubricId: number; description: string; displayOrder: number }[]
      >`
        UPDATE rubric_item
        SET description = COALESCE(${description}, description)
        WHERE id = ${itemId}
        RETURNING id, rubric_id AS "rubricId", description, display_order AS "displayOrder"
      `;
      const item = rows[0];
      if (!item) {
        throw new PgRepositoryError(`Rubric item ${itemId} not found`, 'NOT_FOUND');
      }
      if (data.levels !== undefined) {
        await tx`DELETE FROM rubric_level WHERE rubric_item_id = ${itemId}`;
        await this._insertLevels(tx, itemId, data.levels);
      }
      const levels = await this._findLevels(tx, itemId);
      return { ...item, levels };
    });
  }

  async deleteItem(itemId: number): Promise<void> {
    const rows = await this.sql<{ id: number }[]>`
      DELETE FROM rubric_item WHERE id = ${itemId}
      RETURNING id
    `;
    if (rows.length === 0) {
      throw new PgRepositoryError(`Rubric item ${itemId} not found`, 'NOT_FOUND');
    }
  }

  async hasCorrectionItems(itemId: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM correction_item WHERE rubric_item_id = ${itemId}) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }

  async isFrozen(_id: number, _academicYear?: string): Promise<boolean> {
    // schema.sql has no `frozen` column on rubric — no code path ever sets it.
    return false;
  }

  async getExcelenteSumExcluding(moduleId: number, excludeItemId?: number): Promise<number> {
    const excludeId = excludeItemId ?? null;
    const rows = await this.sql<{ sum: number }[]>`
      SELECT COALESCE(SUM(rl.score), 0)::float8 AS sum
      FROM rubric r
      JOIN rubric_item ri ON ri.rubric_id = r.id
      JOIN rubric_level rl ON rl.rubric_item_id = ri.id AND rl.name = 'Excelente'
      WHERE r.module_id = ${moduleId}
        AND (${excludeId}::int IS NULL OR ri.id <> ${excludeId})
    `;
    return rows[0]?.sum ?? 0;
  }

  async replaceAll(moduleId: number, academicYear: string, items: AddRubricItemData[]): Promise<void> {
    await this.sql.begin(async (tx) => {
      const rubricId = await this._findOrCreateRubric(tx, moduleId, academicYear);
      await tx`DELETE FROM rubric_item WHERE rubric_id = ${rubricId}`;
      for (const item of items) {
        const rows = await tx<{ id: number }[]>`
          INSERT INTO rubric_item (rubric_id, description, display_order)
          VALUES (${rubricId}, ${item.description}, ${item.displayOrder})
          RETURNING id
        `;
        await this._insertLevels(tx, rows[0]!.id, item.levels);
      }
    });
  }

  private async _findOrCreateRubric(sql: SqlExecutor, moduleId: number, academicYear: string): Promise<number> {
    const existing = await sql<{ id: number }[]>`
      SELECT id FROM rubric WHERE module_id = ${moduleId} AND academic_year = ${academicYear}
    `;
    if (existing[0]) return existing[0].id;
    const created = await sql<{ id: number }[]>`
      INSERT INTO rubric (module_id, academic_year) VALUES (${moduleId}, ${academicYear})
      RETURNING id
    `;
    return created[0]!.id;
  }

  private async _insertLevels(
    sql: SqlExecutor,
    itemId: number,
    levels: AddRubricItemData['levels'],
  ): Promise<void> {
    for (const [i, level] of levels.entries()) {
      await sql`
        INSERT INTO rubric_level (rubric_item_id, name, score, display_order)
        VALUES (${itemId}, ${level.name}, ${level.score}, ${level.displayOrder ?? i + 1})
      `;
    }
  }

  private async _findLevels(sql: SqlExecutor, itemId: number): Promise<RubricLevel[]> {
    return sql<RubricLevel[]>`
      SELECT id, name, score, display_order AS "displayOrder"
      FROM rubric_level
      WHERE rubric_item_id = ${itemId}
      ORDER BY display_order
    `;
  }

  private async _findItems(sql: SqlExecutor, rubricId: number): Promise<RubricItemFull[]> {
    return sql<RubricItemFull[]>`
      SELECT ri.id, ri.rubric_id AS "rubricId", ri.description, ri.display_order AS "displayOrder",
             COALESCE(
               (SELECT json_agg(
                  json_build_object('id', rl.id, 'name', rl.name, 'score', rl.score, 'displayOrder', rl.display_order)
                  ORDER BY rl.display_order
                )
                FROM rubric_level rl
                WHERE rl.rubric_item_id = ri.id),
               '[]'::json
             ) AS levels
      FROM rubric_item ri
      WHERE ri.rubric_id = ${rubricId}
      ORDER BY ri.display_order
    `;
  }
}
