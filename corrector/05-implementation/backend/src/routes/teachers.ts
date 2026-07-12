import { Router } from 'express';
import type { TeacherRepository } from '../repositories/teacher.repository';
import { TeacherService } from '../services/teacher.service';
import { requireAdmin } from '../middleware/auth';

export function createTeachersRouter(repo: TeacherRepository): Router {
  const router = Router();
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
  });

  router.put('/:id', requireAdmin, async (req, res) => {
    const { username } = req.body as { username?: string };
    const result = await service.update(Number(req.params.id), { username });
    res.json(result);
  });

  router.post('/:id/unlock', requireAdmin, async (req, res) => {
    const result = await service.unlock(Number(req.params.id));
    res.json(result);
  });

  router.delete('/:id', requireAdmin, async (req, res) => {
    await service.delete(Number(req.params.id));
    res.status(204).send();
  });

  return router;
}
