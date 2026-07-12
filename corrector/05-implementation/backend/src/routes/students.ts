import { Router } from 'express';
import type { StudentRepository } from '../repositories/student.repository';
import type { StudentParserService } from '../services/file-parser.service';
import { StudentService } from '../services/student.service';
import { StudentImporter } from '../services/student-importer';
import { mapError } from './error';

function parseMultipartFile(body: Buffer, boundary: string): { filename: string; content: Buffer } | null {
  const sep = Buffer.from(`--${boundary}`);
  let start = 0;
  const parts: Buffer[] = [];
  let idx: number;
  while ((idx = body.indexOf(sep, start)) !== -1) {
    parts.push(body.slice(start, idx));
    start = idx + sep.length;
  }
  parts.push(body.slice(start));

  for (const part of parts) {
    const eoh = part.indexOf('\r\n\r\n');
    if (eoh === -1) continue;
    const header = part.slice(0, eoh).toString();
    const fileContent = part.slice(eoh + 4, part.length - 2);
    const filenameMatch = /filename="([^"]+)"/.exec(header);
    if (filenameMatch) {
      return { filename: filenameMatch[1], content: fileContent };
    }
  }
  return null;
}

export function createStudentsRouter(repo: StudentRepository, parser: StudentParserService): Router {
  const router = Router();
  const service = new StudentService(repo);

  router.get('/', async (req, res) => {
    const name = req.query.name as string | undefined;
    const cycleId = req.query.cycleId !== undefined ? Number(req.query.cycleId) : undefined;
    const moduleId = req.query.moduleId !== undefined ? Number(req.query.moduleId) : undefined;
    const result = await service.list({ name, cycleId, moduleId });
    res.json(result);
  });

  router.post('/upload', async (req, res) => {
    try {
      const contentType = req.headers['content-type'] ?? '';
      const boundaryMatch = /boundary=(.+)/.exec(contentType);
      if (!boundaryMatch) {
        res.status(400).json({ error: 'Expected multipart/form-data' });
        return;
      }
      const boundary = boundaryMatch[1].trim();

      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', resolve);
        req.on('error', reject);
      });
      const body = Buffer.concat(chunks);

      const file = parseMultipartFile(body, boundary);
      if (!file) {
        res.status(400).json({ error: 'No file found in request' });
        return;
      }

      const ext = (file.filename.split('.').pop() ?? '').toLowerCase();
      if (!['csv', 'json', 'yaml', 'yml'].includes(ext)) {
        res.status(400).json({ error: `Unsupported file format: .${ext}`, code: 'UNSUPPORTED_FORMAT' });
        return;
      }

      try {
        await parser.parseStudents(file.content, file.filename);
      } catch (parseErr) {
        const e = parseErr instanceof Error ? parseErr : new Error(String(parseErr));
        res.status(422).json({ errors: [{ message: e.message }] });
        return;
      }

      const importer = new StudentImporter(repo, parser);
      const result = await importer.importFromFile(file.content, file.filename);
      res.status(201).json({ created: result.created, errors: [] });
    } catch (err) {
      const { status, body } = mapError(err);
      if (status === 400) {
        res.status(422).json({ errors: [body] });
        return;
      }
      res.status(status).json(body);
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { name, cycleId, moduleId } = req.body as {
        name?: string;
        cycleId?: number;
        moduleId?: number;
      };
      const result = await service.create({
        name: name ?? '',
        cycleId: cycleId ?? 0,
        moduleId: moduleId ?? 0,
      });
      res.status(201).json(result);
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  router.put('/:id', async (req, res) => {
    try {
      const { name, cycleId, moduleId } = req.body as {
        name?: string;
        cycleId?: number;
        moduleId?: number;
      };
      const result = await service.update(Number(req.params.id), { name, cycleId, moduleId });
      res.status(200).json(result);
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  router.delete('/:id', async (req, res) => {
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
