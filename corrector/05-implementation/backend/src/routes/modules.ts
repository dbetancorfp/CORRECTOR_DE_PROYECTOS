import { Router } from 'express';
import type { ModuleRepository } from '../repositories/module.repository';
import { ModuleService } from '../services/module.service';
import { requireAdmin } from '../middleware/auth';

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
  });

  router.put('/:id', requireAdmin, async (req, res) => {
    const { name, weeklyHours, cycleId, legislationId } = req.body as {
      name?: string;
      weeklyHours?: number;
      cycleId?: number;
      legislationId?: number;
    };
    const result = await service.update(Number(req.params.id), { name, weeklyHours, cycleId, legislationId });
    res.json(result);
  });

  router.delete('/:id', requireAdmin, async (req, res) => {
    await service.delete(Number(req.params.id));
    res.status(204).send();
  });

  return router;
}
