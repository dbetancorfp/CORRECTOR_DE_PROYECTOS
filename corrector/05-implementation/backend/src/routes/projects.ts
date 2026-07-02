import { Router } from 'express';
import type { ProjectRepository } from '../repositories/project.repository';
import type { ProjectStudentRepository } from '../repositories/project-student.repository';
import { ProjectService } from '../services/project.service';
import { ProjectStudentService } from '../services/project-student.service';
import { mapError } from './error';

export function createProjectsRouter(
  repo: ProjectRepository,
  psRepo: ProjectStudentRepository,
): Router {
  const router = Router();
  const service = new ProjectService(repo);
  const psService = new ProjectStudentService(psRepo);

  router.get('/', async (req, res) => {
    const name = req.query.name as string | undefined;
    const academicYear = req.query.academicYear as string | undefined;
    const moduleId = req.query.moduleId !== undefined ? Number(req.query.moduleId) : undefined;
    const legislationId = req.query.legislationId !== undefined ? Number(req.query.legislationId) : undefined;
    const result = await service.list({ name, academicYear, moduleId, legislationId });
    res.json(result);
  });

  router.post('/', async (req, res) => {
    try {
      const { name, academicYear, moduleId } = req.body as {
        name?: string;
        academicYear?: string;
        moduleId?: number;
      };
      const result = await service.create({
        name: name ?? '',
        academicYear: academicYear ?? '',
        moduleId: moduleId ?? 0,
      });
      res.status(201).json(result);
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

  router.get('/:id/students', async (req, res) => {
    const students = await psService.getStudentsForProject(Number(req.params.id));
    res.json(students);
  });

  router.post('/:id/students', async (req, res) => {
    try {
      const { studentIds } = req.body as { studentIds?: number[] };
      if (!studentIds || studentIds.length === 0) {
        res.status(400).json({ error: 'studentIds must be a non-empty array' });
        return;
      }
      const result = await psService.assign(Number(req.params.id), studentIds);
      res.status(201).json(result);
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  router.delete('/:pId/students/:sId', async (req, res) => {
    try {
      await psService.unassign(Number(req.params.pId), Number(req.params.sId));
      res.status(204).send();
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  return router;
}
