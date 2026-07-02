import { Router } from 'express';
import type { CycleRepository } from '../repositories/cycle.repository';
import { CycleService } from '../services/cycle.service';
import { requireAdmin } from '../middleware/auth';
import { mapError } from './error';

export function createCyclesRouter(repo: CycleRepository): Router {
  const router = Router();
  const service = new CycleService(repo);

  router.get('/', async (req, res) => {
    const legislationId = req.query.legislationId !== undefined ? Number(req.query.legislationId) : undefined;
    const year = req.query.year !== undefined ? Number(req.query.year) : undefined;
    const name = req.query.name as string | undefined;
    const result = await service.list({ legislationId, year, name });
    res.json(result);
  });

  router.post('/', requireAdmin, async (req, res) => {
    try {
      const { name } = req.body as { name?: string };
      const result = await service.create(name ?? '');
      res.status(201).json(result);
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { name } = req.body as { name?: string };
      const result = await service.update(Number(req.params.id), name ?? '');
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
