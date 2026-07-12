import type { SqlExecutor } from '../src/db/sql-executor';

export interface SeedSqlClient extends SqlExecutor {
  unsafe(query: string): Promise<unknown>;
}

// Shared fixture for both the bun:test integration suite (tests/setup.ts)
// and Cypress e2e runs (scripts/seed-e2e.ts) — the two must stay in sync,
// since e2e specs (uc-01..uc-05.cy.ts) assume this exact data (admin/
// Admin1234!, profesor1/12345678, LOGSE with no modules, etc.).
export async function seedFixture(sql: SeedSqlClient): Promise<void> {
  // schema.sql seeds one throwaway admin (id=1, password '12345678') on every
  // fresh apply — replaced below by the full fixture, which reassigns id=1 to
  // 'admin' with the credentials tests/auth.test.ts actually logs in with.
  await sql`DELETE FROM teacher`;

  const adminHash = await Bun.password.hash('Admin1234!', { algorithm: 'bcrypt', cost: 10 });
  const defaultHash = await Bun.password.hash('12345678', { algorithm: 'bcrypt', cost: 10 });
  const tutorHash = await Bun.password.hash('correctpass', { algorithm: 'bcrypt', cost: 10 });

  // Legislations
  await sql`INSERT INTO legislation (id, name, start_year) VALUES (1, 'LOGSE', 1990)`;
  await sql`INSERT INTO legislation (id, name, start_year) VALUES (2, 'LOMLOE', 2020)`;

  // Cycles
  await sql`INSERT INTO cycle (id, name) VALUES (1, 'DAW')`;
  await sql`INSERT INTO cycle (id, name) VALUES (2, 'ASIR')`;
  await sql`INSERT INTO cycle (id, name) VALUES (3, 'ExistingCycle')`;

  // Modules
  await sql`
    INSERT INTO module (id, name, weekly_hours, cycle_id, legislation_id)
    VALUES (1, 'DEW', 7, 1, 2)
  `;
  await sql`
    INSERT INTO module (id, name, weekly_hours, cycle_id, legislation_id)
    VALUES (2, 'ANA', 5, 1, 2)
  `;
  // Unassigned module — teacher_module.module_id is UNIQUE (one teacher per module),
  // so tests that assign a *new* teacher to a module need one with no existing assignment.
  await sql`
    INSERT INTO module (id, name, weekly_hours, cycle_id, legislation_id)
    VALUES (3, 'BD', 4, 1, 2)
  `;

  // Teachers — tutor_cycle_id set only for the tutor (trigger enforces max 1 per cycle)
  await sql`
    INSERT INTO teacher (id, username, password_hash, role, must_change_password, failed_login_attempts, account_locked, tutor_cycle_id)
    VALUES (1, 'admin', ${adminHash}, 'admin', FALSE, 0, FALSE, NULL)
  `;
  await sql`
    INSERT INTO teacher (id, username, password_hash, role, must_change_password, failed_login_attempts, account_locked, tutor_cycle_id)
    VALUES (2, 'profesor1', ${defaultHash}, 'profesor', TRUE, 0, FALSE, NULL)
  `;
  await sql`
    INSERT INTO teacher (id, username, password_hash, role, must_change_password, failed_login_attempts, account_locked, tutor_cycle_id)
    VALUES (3, 'dbetqui', ${tutorHash}, 'tutor', FALSE, 0, FALSE, 1)
  `;
  await sql`
    INSERT INTO teacher (id, username, password_hash, role, must_change_password, failed_login_attempts, account_locked, tutor_cycle_id)
    VALUES (4, 'dbetotro', ${defaultHash}, 'profesor', TRUE, 0, FALSE, NULL)
  `;
  await sql`
    INSERT INTO teacher (id, username, password_hash, role, must_change_password, failed_login_attempts, account_locked, tutor_cycle_id)
    VALUES (5, 'otroprofe', ${defaultHash}, 'profesor', TRUE, 0, FALSE, NULL)
  `;
  await sql`
    INSERT INTO teacher (id, username, password_hash, role, must_change_password, failed_login_attempts, account_locked, tutor_cycle_id)
    VALUES (6, 'lockedteacher', ${defaultHash}, 'profesor', TRUE, 0, FALSE, NULL)
  `;
  // Dedicated admin used only for the admin-session cookie — kept separate from
  // teacher id 1 ('admin'), which some tests delete to verify DELETE /api/teachers/:id.
  await sql`
    INSERT INTO teacher (id, username, password_hash, role, must_change_password, failed_login_attempts, account_locked, tutor_cycle_id)
    VALUES (7, 'admin-session-user', ${adminHash}, 'admin', FALSE, 0, FALSE, NULL)
  `;

  // Teacher <-> module assignments. The in-memory fixture also assigned teacher 3
  // (tutor) to module 1 alongside teacher 2, but schema.sql's UNIQUE(module_id) on
  // teacher_module enforces one teacher per module — that second assignment was
  // never exercised by any test (dbetqui's tutor tests only need the tutor role
  // and cycle membership, not a module assignment), so it's dropped here.
  await sql`INSERT INTO teacher_module (teacher_id, module_id) VALUES (2, 1)`;
  await sql`INSERT INTO teacher_module (teacher_id, module_id) VALUES (4, 2)`;

  // Students
  await sql`INSERT INTO student (id, name, cycle_id) VALUES (1, 'JJ499', 1)`;
  await sql`INSERT INTO student (id, name, cycle_id) VALUES (2, 'MnP454', 1)`;
  // 3-5: only referenced by project-students.test.ts's max-3-per-project assignment flow.
  await sql`INSERT INTO student (id, name, cycle_id) VALUES (3, 'AB123', 1)`;
  await sql`INSERT INTO student (id, name, cycle_id) VALUES (4, 'CD456', 1)`;
  await sql`INSERT INTO student (id, name, cycle_id) VALUES (5, 'EF789', 1)`;

  // Projects (project 1 has module_id=2 so module 1 has no projects -> DELETE module 1 -> 204)
  await sql`
    INSERT INTO project (id, name, academic_year, module_id)
    VALUES (1, 'Test Project', '2024-2025', 2)
  `;
  await sql`
    INSERT INTO project (id, name, academic_year, module_id)
    VALUES (2, 'Project B', '2024-2025', 2)
  `;

  // Rubric for module 1 (Excelente sum = 6.0 so adding Excelente=2.0 is within limit)
  await sql`INSERT INTO rubric (id, module_id, academic_year, name) VALUES (1, 1, '2024-2025', NULL)`;

  await sql`INSERT INTO rubric_item (id, rubric_id, description, display_order) VALUES (1, 1, 'Presentación', 1)`;
  await sql`INSERT INTO rubric_item (id, rubric_id, description, display_order) VALUES (2, 1, 'Código', 2)`;

  await sql`INSERT INTO rubric_level (id, rubric_item_id, name, display_order, score) VALUES (1, 1, 'Excelente', 1, 3.0)`;
  await sql`INSERT INTO rubric_level (id, rubric_item_id, name, display_order, score) VALUES (2, 1, 'Bien', 2, 1.5)`;
  await sql`INSERT INTO rubric_level (id, rubric_item_id, name, display_order, score) VALUES (3, 1, 'Mal', 3, 0.0)`;
  await sql`INSERT INTO rubric_level (id, rubric_item_id, name, display_order, score) VALUES (4, 2, 'Excelente', 1, 3.0)`;
  await sql`INSERT INTO rubric_level (id, rubric_item_id, name, display_order, score) VALUES (5, 2, 'Bien', 2, 1.5)`;
  await sql`INSERT INTO rubric_level (id, rubric_item_id, name, display_order, score) VALUES (6, 2, 'Mal', 3, 0.0)`;

  // Correction for teacher 1 (student 2, module 1 — a combination no test POSTs to,
  // so it survives untouched) so 'DELETE /api/teachers/1 has correction records' -> 409 is real.
  await sql`
    INSERT INTO correction (id, student_id, module_id, rubric_id, teacher_id, academic_year, final_score)
    VALUES (1, 2, 1, 1, 1, '2024-2025', 7.5)
  `;
  await sql`INSERT INTO correction_item (correction_id, rubric_item_id, rubric_level_id) VALUES (1, 1, 1)`;
  await sql`INSERT INTO correction_item (correction_id, rubric_item_id, rubric_level_id) VALUES (1, 2, 5)`;

  // Sequences restart at 100 to avoid clashing with the explicit fixture IDs above.
  for (const seq of [
    'legislation_id_seq',
    'cycle_id_seq',
    'module_id_seq',
    'teacher_id_seq',
    'student_id_seq',
    'project_id_seq',
    'rubric_id_seq',
    'rubric_item_id_seq',
    'rubric_level_id_seq',
    'correction_id_seq',
  ]) {
    await sql.unsafe(`ALTER SEQUENCE ${seq} RESTART WITH 100`);
  }
}
