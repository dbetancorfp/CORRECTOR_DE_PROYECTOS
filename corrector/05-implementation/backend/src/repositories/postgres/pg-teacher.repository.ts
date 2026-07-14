import type {
  AuthTeacher,
  CreateTeacherData,
  TeacherFilters,
  TeacherListItem,
  TeacherRepository,
} from '../teacher.repository';
import type { SqlExecutor } from '../../db/sql-executor';
import { PgRepositoryError, assertRowsAffected } from './pg-repository-error';

const MODULE_ALREADY_ASSIGNED_MESSAGE = /teacher_module_module_id_key/;

export class PgTeacherRepository implements TeacherRepository {
  constructor(private readonly sql: SqlExecutor) {}

  async findAll(filters: TeacherFilters = {}): Promise<TeacherListItem[]> {
    const moduleId = filters.moduleId ?? null;
    const cycleId = filters.cycleId ?? null;
    const legislationId = filters.legislationId ?? null;
    const year = filters.year ?? null;
    return this.sql<TeacherListItem[]>`
      SELECT t.id, t.username, t.role,
             CASE WHEN t.must_change_password THEN 'default' ELSE 'changed' END AS "passwordStatus",
             t.account_locked AS "accountLocked",
             t.failed_login_attempts AS "failedLoginAttempts",
             COALESCE(
               (SELECT json_agg(json_build_object('id', m.id, 'name', m.name) ORDER BY m.id)
                FROM teacher_module tm
                JOIN module m ON m.id = tm.module_id
                WHERE tm.teacher_id = t.id),
               '[]'::json
             ) AS modules
      FROM teacher t
      WHERE (
        ${moduleId}::int IS NULL
        OR EXISTS (SELECT 1 FROM teacher_module tm WHERE tm.teacher_id = t.id AND tm.module_id = ${moduleId})
      )
      AND (
        ${cycleId}::int IS NULL
        OR EXISTS (
          SELECT 1 FROM teacher_module tm JOIN module m ON m.id = tm.module_id
          WHERE tm.teacher_id = t.id AND m.cycle_id = ${cycleId}
        )
      )
      AND (
        ${legislationId}::int IS NULL
        OR EXISTS (
          SELECT 1 FROM teacher_module tm JOIN module m ON m.id = tm.module_id
          WHERE tm.teacher_id = t.id AND m.legislation_id = ${legislationId}
        )
      )
      AND (
        ${year}::smallint IS NULL
        OR EXISTS (
          SELECT 1 FROM teacher_module tm
          JOIN module m ON m.id = tm.module_id
          JOIN legislation l ON l.id = m.legislation_id
          WHERE tm.teacher_id = t.id AND l.start_year = ${year}
        )
      )
      ORDER BY t.id
    `;
  }

  async findById(id: number): Promise<AuthTeacher | null> {
    const rows = await this.sql<AuthTeacher[]>`
      SELECT id, username, password_hash AS "passwordHash", role,
             account_locked AS "accountLocked",
             failed_login_attempts AS "failedLoginAttempts",
             must_change_password AS "mustChangePassword"
      FROM teacher
      WHERE id = ${id}
    `;
    return rows[0] ?? null;
  }

  async findByUsername(username: string): Promise<AuthTeacher | null> {
    const rows = await this.sql<AuthTeacher[]>`
      SELECT id, username, password_hash AS "passwordHash", role,
             account_locked AS "accountLocked",
             failed_login_attempts AS "failedLoginAttempts",
             must_change_password AS "mustChangePassword"
      FROM teacher
      WHERE username = ${username}
    `;
    return rows[0] ?? null;
  }

  async save(data: CreateTeacherData): Promise<TeacherListItem> {
    const rows = await this.sql<{ id: number }[]>`
      INSERT INTO teacher (username, password_hash, role, must_change_password)
      VALUES (${data.username}, ${data.passwordHash}, ${data.role}, ${data.mustChangePassword})
      RETURNING id
    `;
    const id = rows[0]!.id;
    try {
      await this.sql`
        INSERT INTO teacher_module (teacher_id, module_id) VALUES (${id}, ${data.moduleId})
      `;
    } catch (err) {
      // teacher_module.module_id is UNIQUE (one teacher per module) — roll back
      // the just-created teacher row so a failed assignment doesn't leave an orphan.
      await this.sql`DELETE FROM teacher WHERE id = ${id}`;
      if (err instanceof Error && MODULE_ALREADY_ASSIGNED_MESSAGE.test(err.message)) {
        throw new PgRepositoryError(
          `Module ${data.moduleId} already has a teacher assigned`,
          'MODULE_ALREADY_ASSIGNED',
        );
      }
      throw err;
    }
    return this._findListItem(id);
  }

  async update(id: number, data: Partial<CreateTeacherData>): Promise<TeacherListItem> {
    const username = data.username ?? null;
    const rows = await this.sql<{ id: number }[]>`
      UPDATE teacher SET username = COALESCE(${username}, username)
      WHERE id = ${id}
      RETURNING id
    `;
    assertRowsAffected(rows.length, `Teacher ${id} not found`);
    return this._findListItem(id);
  }

  async delete(id: number): Promise<void> {
    const rows = await this.sql<{ id: number }[]>`
      DELETE FROM teacher WHERE id = ${id}
      RETURNING id
    `;
    assertRowsAffected(rows.length, `Teacher ${id} not found`);
  }

  async hasCorrections(id: number): Promise<boolean> {
    const rows = await this.sql<{ exists: boolean }[]>`
      SELECT EXISTS(SELECT 1 FROM correction WHERE teacher_id = ${id}) AS "exists"
    `;
    return rows[0]?.exists ?? false;
  }

  async updateFailedAttempts(id: number, count: number): Promise<void> {
    await this.sql`UPDATE teacher SET failed_login_attempts = ${count} WHERE id = ${id}`;
  }

  async resetFailedAttempts(id: number): Promise<void> {
    await this.sql`
      UPDATE teacher SET failed_login_attempts = 0, account_locked = FALSE WHERE id = ${id}
    `;
  }

  async lockAccount(id: number): Promise<void> {
    await this.sql`UPDATE teacher SET account_locked = TRUE WHERE id = ${id}`;
  }

  async updatePassword(id: number, newHash: string): Promise<void> {
    await this.sql`
      UPDATE teacher
      SET password_hash = ${newHash}, must_change_password = FALSE
      WHERE id = ${id}
    `;
  }

  private async _findListItem(id: number): Promise<TeacherListItem> {
    const rows = await this.sql<TeacherListItem[]>`
      SELECT t.id, t.username, t.role,
             CASE WHEN t.must_change_password THEN 'default' ELSE 'changed' END AS "passwordStatus",
             t.account_locked AS "accountLocked",
             t.failed_login_attempts AS "failedLoginAttempts",
             COALESCE(
               (SELECT json_agg(json_build_object('id', m.id, 'name', m.name) ORDER BY m.id)
                FROM teacher_module tm
                JOIN module m ON m.id = tm.module_id
                WHERE tm.teacher_id = t.id),
               '[]'::json
             ) AS modules
      FROM teacher t
      WHERE t.id = ${id}
    `;
    return rows[0]!;
  }
}
