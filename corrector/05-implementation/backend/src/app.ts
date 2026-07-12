import { join } from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import type { Express, Request, Response, NextFunction } from 'express';
import { mapError } from './routes/error';
import type { Store } from './repositories/in-memory/store';
import type { TransactionalSqlExecutor } from './db/sql-executor';
import { InMemoryTeacherRepository } from './repositories/in-memory/in-memory-teacher.repository';
import { InMemorySessionRepository } from './repositories/in-memory/in-memory-session.repository';
import type { SessionMap } from './repositories/in-memory/in-memory-session.repository';
import { InMemoryLegislationRepository } from './repositories/in-memory/in-memory-legislation.repository';
import { InMemoryCycleRepository } from './repositories/in-memory/in-memory-cycle.repository';
import { InMemoryModuleRepository } from './repositories/in-memory/in-memory-module.repository';
import { InMemoryStudentRepository } from './repositories/in-memory/in-memory-student.repository';
import { InMemoryProjectRepository } from './repositories/in-memory/in-memory-project.repository';
import { InMemoryProjectStudentRepository } from './repositories/in-memory/in-memory-project-student.repository';
import { InMemoryCorrectionRepository } from './repositories/in-memory/in-memory-correction.repository';
import { InMemoryRubricRepository } from './repositories/in-memory/in-memory-rubric.repository';
import { PgLegislationRepository } from './repositories/postgres/pg-legislation.repository';
import { PgCycleRepository } from './repositories/postgres/pg-cycle.repository';
import { PgModuleRepository } from './repositories/postgres/pg-module.repository';
import { PgTeacherRepository } from './repositories/postgres/pg-teacher.repository';
import { PgStudentRepository } from './repositories/postgres/pg-student.repository';
import { PgProjectRepository } from './repositories/postgres/pg-project.repository';
import { PgProjectStudentRepository } from './repositories/postgres/pg-project-student.repository';
import { PgRubricRepository } from './repositories/postgres/pg-rubric.repository';
import { PgCorrectionRepository } from './repositories/postgres/pg-correction.repository';
import { resolveUser } from './middleware/auth';
import { createAuthRouter } from './routes/auth';
import { createLegislationRouter } from './routes/legislation';
import { createCyclesRouter } from './routes/cycles';
import { createModulesRouter } from './routes/modules';
import { createTeachersRouter } from './routes/teachers';
import { createStudentsRouter } from './routes/students';
import { createProjectsRouter } from './routes/projects';
import { createCorrectionsRouter } from './routes/corrections';
import { createGradesRouter } from './routes/grades';
import { createRubricRouter } from './routes/rubric';
import { CsvStudentParserService } from './services/csv-student-parser.service';
import { GradeService } from './services/grade.service';
import { GradeCalculator } from './services/grade-calculator';
import type { TeacherRepository } from './repositories/teacher.repository';
import type { LegislationRepository } from './repositories/legislation.repository';
import type { CycleRepository } from './repositories/cycle.repository';
import type { ModuleRepository } from './repositories/module.repository';
import type { StudentRepository } from './repositories/student.repository';
import type { ProjectRepository } from './repositories/project.repository';
import type { ProjectStudentRepository } from './repositories/project-student.repository';
import type { RubricRepository } from './repositories/rubric.repository';
import type { CorrectionRepository } from './repositories/correction.repository';

export type AppDeps =
  | { backend: 'memory'; store: Store }
  | { backend: 'postgres'; sql: TransactionalSqlExecutor; sessions?: SessionMap };

interface Repositories {
  teacherRepo: TeacherRepository;
  legislationRepo: LegislationRepository;
  cycleRepo: CycleRepository;
  moduleRepo: ModuleRepository;
  studentRepo: StudentRepository;
  projectRepo: ProjectRepository;
  psRepo: ProjectStudentRepository;
  correctionRepo: CorrectionRepository;
  rubricRepo: RubricRepository;
}

function buildRepositories(deps: AppDeps): Repositories {
  if (deps.backend === 'postgres') {
    const { sql } = deps;
    return {
      teacherRepo: new PgTeacherRepository(sql),
      legislationRepo: new PgLegislationRepository(sql),
      cycleRepo: new PgCycleRepository(sql),
      moduleRepo: new PgModuleRepository(sql),
      studentRepo: new PgStudentRepository(sql),
      projectRepo: new PgProjectRepository(sql),
      psRepo: new PgProjectStudentRepository(sql),
      correctionRepo: new PgCorrectionRepository(sql),
      rubricRepo: new PgRubricRepository(sql),
    };
  }

  const { store } = deps;
  return {
    teacherRepo: new InMemoryTeacherRepository(store),
    legislationRepo: new InMemoryLegislationRepository(store),
    cycleRepo: new InMemoryCycleRepository(store),
    moduleRepo: new InMemoryModuleRepository(store),
    studentRepo: new InMemoryStudentRepository(store),
    projectRepo: new InMemoryProjectRepository(store),
    psRepo: new InMemoryProjectStudentRepository(store),
    correctionRepo: new InMemoryCorrectionRepository(store),
    rubricRepo: new InMemoryRubricRepository(store),
  };
}

// Sessions are ephemeral process state, not domain data (no `session` table in
// schema.sql) — a single in-process Map backs InMemorySessionRepository in both
// backends, so restarting the process always clears sessions regardless of DATA_BACKEND.
// `deps.sessions` lets integration tests inject deterministic session tokens
// (e.g. a fixed 'admin-session' cookie) into the postgres backend.
function sessionsMapFor(deps: AppDeps): SessionMap {
  return deps.backend === 'memory' ? deps.store.sessions : deps.sessions ?? new Map();
}

export function createApp(deps: AppDeps): Express {
  const app = express();

  // ── Repositories (single composition root — DIP) ─────────────────────────────
  const {
    teacherRepo,
    legislationRepo,
    cycleRepo,
    moduleRepo,
    studentRepo,
    projectRepo,
    psRepo,
    correctionRepo,
    rubricRepo,
  } = buildRepositories(deps);
  const sessionRepo = new InMemorySessionRepository(sessionsMapFor(deps));

  const studentParser = new CsvStudentParserService(moduleRepo);
  const gradeService = new GradeService(
    correctionRepo,
    moduleRepo,
    studentRepo,
    projectRepo,
    psRepo,
    new GradeCalculator(),
  );

  // ── Middleware ────────────────────────────────────────────────────────────────
  app.use(express.json());
  app.use(cookieParser());
  app.use(resolveUser(teacherRepo, sessionRepo));

  // ── Routes ───────────────────────────────────────────────────────────────────
  app.use('/api/auth', createAuthRouter(teacherRepo, sessionRepo));
  app.use('/api/legislation', createLegislationRouter(legislationRepo));
  app.use('/api/cycles', createCyclesRouter(cycleRepo));
  app.use('/api/modules', createModulesRouter(moduleRepo));
  app.use('/api/teachers', createTeachersRouter(teacherRepo));
  app.use('/api/students', createStudentsRouter(studentRepo, studentParser));
  app.use('/api/projects', createProjectsRouter(projectRepo, psRepo));
  app.use('/api/corrections', createCorrectionsRouter(correctionRepo, rubricRepo, moduleRepo));
  app.use('/api', createGradesRouter(gradeService));
  app.use('/api', createRubricRouter(rubricRepo));

  // ── Frontend static assets ──────────────────────────────────────────────────
  const frontendDir = join(import.meta.dir, '..', '..', 'frontend');
  app.use('/dist', express.static(join(frontendDir, 'dist')));
  // SPA fallback: the client-side router (frontend/src/router.ts) owns every
  // non-API path (/, /admin/legislacion, ...) — serve the same shell for all
  // of them so a direct navigation or a page refresh on a client route works.
  app.get(/^\/(?!api|dist).*/, (_req, res) => res.sendFile(join(frontendDir, 'index.html')));

  // Global error handler — Express 5 forwards async throws here automatically
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const { status, body } = mapError(err);
    res.status(status).json(body);
  });

  return app;
}
