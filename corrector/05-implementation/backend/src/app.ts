import express from 'express';
import cookieParser from 'cookie-parser';
import type { Express } from 'express';
import type { Store } from './repositories/in-memory/store';
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

export function createApp(store: Store): Express {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use(resolveUser(store));

  app.use('/api/auth', createAuthRouter(store));
  app.use('/api/legislation', createLegislationRouter(store));
  app.use('/api/cycles', createCyclesRouter(store));
  app.use('/api/modules', createModulesRouter(store));
  app.use('/api/teachers', createTeachersRouter(store));
  app.use('/api/students', createStudentsRouter(store));
  app.use('/api/projects', createProjectsRouter(store));
  app.use('/api/corrections', createCorrectionsRouter(store));
  app.use('/api', createGradesRouter(store));
  app.use('/api', createRubricRouter(store));

  return app;
}
