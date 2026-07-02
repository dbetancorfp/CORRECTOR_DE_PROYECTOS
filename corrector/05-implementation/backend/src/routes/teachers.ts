import { Router } from 'express';
import type { Store } from '../repositories/in-memory/store';
import { InMemoryTeacherRepository } from '../repositories/in-memory/in-memory-teacher.repository';
import { TeacherService } from '../services/teacher.service';
import { requireAdmin } from '../middleware/auth';
import { mapError } from './error';

export function createTeachersRouter(store: Store): Router {
  const router = Router();
  const repo = new InMemoryTeacherRepository(store);
  const service = new TeacherService(repo);

  router.get('/', async (req, res) => {
    const moduleId = req.query.moduleId !== undefined ? Number(req.query.moduleId) : undefined;
    const cycleId = req.query.cycleId !== undefined ? Number(req.query.cycleId) : undefined;
    const legislationId = req.query.legislationId !== undefined ? Number(req.query.legislationId) : undefined;
    const year = req.query.year !== undefined ? Number(req.query.year) : undefined;
    const result = await service.list({ moduleId, cycleId, legislationId, year });
    res.json(result);
  });

  router.post('/', requireAdmin, async (req, res) => {
    try {
      const { username, password, moduleId } = req.body as {
        username?: string;
        password?: string;
        moduleId?: number;
      };
      const result = await service.create({
        username: username ?? '',
        password: password ?? '',
        moduleId: moduleId ?? 0,
      });
      res.status(201).json(result);
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  router.post('/:id/unlock', requireAdmin, async (req, res) => {
    try {
      const result = await service.unlock(Number(req.params.id));
      res.json(result);
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  router.delete('/:id', requireAdmin, async (req, res) => {
    try {
      await service.delete(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  return router;
}
