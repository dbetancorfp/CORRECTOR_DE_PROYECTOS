import { Router } from 'express';
import type { RubricRepository } from '../repositories/rubric.repository';
import type { RubricParserService } from '../services/file-parser.service';
import { RubricService } from '../services/rubric.service';
import { RubricImporter } from '../services/rubric-importer';
import { mapError } from './error';
import { parseMultipart, extractBoundary, readRequestBody } from './multipart';

export function createRubricRouter(repo: RubricRepository, parser: RubricParserService): Router {
  const router = Router();
  const service = new RubricService(repo);
  const importer = new RubricImporter(repo, parser);

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

  router.put('/rubric/items/:id', async (req, res) => {
    try {
      const { description, displayOrder, levels } = req.body as {
        description?: string;
        displayOrder?: number;
        levels?: Array<{ name: string; score: number; displayOrder: number }>;
      };
      const result = await service.updateItem(Number(req.params.id), { description, displayOrder, levels });
      res.status(200).json(result);
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  router.post('/modules/:id/rubric/upload', async (req, res) => {
    try {
      const boundary = extractBoundary(req.headers['content-type']);
      if (!boundary) {
        res.status(400).json({ error: 'Expected multipart/form-data' });
        return;
      }

      const body = await readRequestBody(req);
      const { fields, file } = parseMultipart(body, boundary);
      if (!file) {
        res.status(400).json({ error: 'No file found in request' });
        return;
      }
      if (!fields.academicYear) {
        res.status(400).json({ error: 'academicYear field is required' });
        return;
      }

      await importer.importFromFile(
        Number(req.params.id),
        fields.academicYear,
        file.content,
        file.filename,
        fields.confirm === 'true',
      );
      res.status(200).json({ ok: true });
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
