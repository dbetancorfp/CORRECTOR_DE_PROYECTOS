import express from 'express';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import type { Store } from './repositories/in-memory/store';
import { InMemoryTeacherRepository } from './repositories/in-memory/in-memory-teacher.repository';
import { InMemorySessionRepository } from './repositories/in-memory/in-memory-session.repository';
import { InMemoryLegislationRepository } from './repositories/in-memory/in-memory-legislation.repository';
import { InMemoryCycleRepository } from './repositories/in-memory/in-memory-cycle.repository';
import { InMemoryModuleRepository } from './repositories/in-memory/in-memory-module.repository';
import { InMemoryStudentRepository } from './repositories/in-memory/in-memory-student.repository';
import { InMemoryProjectRepository } from './repositories/in-memory/in-memory-project.repository';
import { InMemoryProjectStudentRepository } from './repositories/in-memory/in-memory-project-student.repository';
import { InMemoryCorrectionRepository } from './repositories/in-memory/in-memory-correction.repository';
import { InMemoryRubricRepository } from './repositories/in-memory/in-memory-rubric.repository';
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

export function createApp(store: Store): Express {
  const app = express();

  // ── Repositories (single composition root — DIP) ─────────────────────────────
  const teacherRepo = new InMemoryTeacherRepository(store);
  const sessionRepo = new InMemorySessionRepository(store);
  const legislationRepo = new InMemoryLegislationRepository(store);
  const cycleRepo = new InMemoryCycleRepository(store);
  const moduleRepo = new InMemoryModuleRepository(store);
  const studentRepo = new InMemoryStudentRepository(store);
  const projectRepo = new InMemoryProjectRepository(store);
  const psRepo = new InMemoryProjectStudentRepository(store);
  const correctionRepo = new InMemoryCorrectionRepository(store);
  const rubricRepo = new InMemoryRubricRepository(store);

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
  app.use(resolveUser(store));

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

  return app;
}
