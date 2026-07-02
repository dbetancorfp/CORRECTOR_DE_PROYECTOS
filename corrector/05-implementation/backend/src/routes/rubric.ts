import { Router } from 'express';
import type { Store } from '../repositories/in-memory/store';
import { InMemoryRubricRepository } from '../repositories/in-memory/in-memory-rubric.repository';
import { RubricService } from '../services/rubric.service';
import { mapError } from './error';

export function createRubricRouter(store: Store): Router {
  const router = Router();
  const repo = new InMemoryRubricRepository(store);
  const service = new RubricService(repo);

  router.get('/modules/:id/rubric', async (req, res) => {
    const moduleId = Number(req.params.id);
    const academicYear = req.query.academicYear as string | undefined;
    if (!academicYear) {
      res.status(400).json({ error: 'academicYear query param is required' });
      return;
    }
    try {
      const rubric = await service.getRubricForModule(moduleId, academicYear);
      res.json(rubric);
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  router.post('/modules/:id/rubric/items', async (req, res) => {
    try {
      const moduleId = Number(req.params.id);
      const { academicYear, description, displayOrder, levels } = req.body as {
        academicYear?: string;
        description?: string;
        displayOrder?: number;
        levels?: Array<{ name: string; score: number; displayOrder: number }>;
      };
      const result = await service.addItem(moduleId, {
        academicYear: academicYear ?? '',
        description: description ?? '',
        displayOrder: displayOrder ?? 1,
        levels: levels ?? [],
      });
      res.status(201).json(result);
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  router.delete('/rubric/items/:id', async (req, res) => {
    try {
      await service.deleteItem(Number(req.params.id));
      res.status(204).send();
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  return router;
}
