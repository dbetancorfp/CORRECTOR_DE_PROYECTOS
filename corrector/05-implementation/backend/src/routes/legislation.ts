import { Router } from 'express';
import type { LegislationRepository } from '../repositories/legislation.repository';
import { LegislationService } from '../services/legislation.service';
import { requireAdmin } from '../middleware/auth';
import { mapError } from './error';

export function createLegislationRouter(repo: LegislationRepository): Router {
  const router = Router();
  const service = new LegislationService(repo);

  router.get('/', async (req, res) => {
    const year = req.query.year !== undefined ? Number(req.query.year) : undefined;
    const name = req.query.name as string | undefined;
    const result = await service.list({ ...(year !== undefined && { year }), ...(name !== undefined && { name }) });
    res.json(result);
  });

  router.post('/', requireAdmin, async (req, res) => {
    try {
      const { name, startYear } = req.body as { name?: string; startYear?: number };
      const result = await service.create(name ?? '', startYear ?? 0);
      res.status(201).json(result);
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  router.put('/:id', requireAdmin, async (req, res) => {
    try {
      const { name, startYear } = req.body as { name?: string; startYear?: number };
      const result = await service.update(Number(req.params.id), { name, startYear });
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
