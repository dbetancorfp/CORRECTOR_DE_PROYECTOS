import { Router } from 'express';
import type { ModuleRepository } from '../repositories/module.repository';
import { ModuleService } from '../services/module.service';
import { requireAdmin } from '../middleware/auth';
import { mapError } from './error';

export function createModulesRouter(repo: ModuleRepository): Router {
  const router = Router();
  const service = new ModuleService(repo);

  router.get('/', async (req, res) => {
    const cycleId = req.query.cycleId !== undefined ? Number(req.query.cycleId) : undefined;
    const legislationId = req.query.legislationId !== undefined ? Number(req.query.legislationId) : undefined;
    const year = req.query.year !== undefined ? Number(req.query.year) : undefined;
    const teacherId = req.query.teacherId !== undefined ? Number(req.query.teacherId) : undefined;
    const name = req.query.name as string | undefined;
    const result = await service.list({ cycleId, legislationId, year, teacherId, name });
    res.json(result);
  });

  router.post('/', requireAdmin, async (req, res) => {
    try {
      const { name, weeklyHours, cycleId, legislationId } = req.body as {
        name?: string;
        weeklyHours?: number;
        cycleId?: number;
        legislationId?: number;
      };
      const result = await service.create({
        name: name ?? '',
        weeklyHours: weeklyHours ?? 0,
        cycleId: cycleId ?? 0,
        legislationId: legislationId ?? 0,
      });
      res.status(201).json(result);
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
