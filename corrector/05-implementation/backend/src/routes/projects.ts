import { Router } from 'express';
import type { Store } from '../repositories/in-memory/store';
import { InMemoryProjectRepository } from '../repositories/in-memory/in-memory-project.repository';
import { InMemoryProjectStudentRepository } from '../repositories/in-memory/in-memory-project-student.repository';
import { ProjectService } from '../services/project.service';
import { ProjectStudentService } from '../services/project-student.service';
import { mapError } from './error';

export function createProjectsRouter(store: Store): Router {
  const router = Router();
  const repo = new InMemoryProjectRepository(store);
  const psRepo = new InMemoryProjectStudentRepository(store);
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
    const projectId = Number(req.params.pId);
    const studentId = Number(req.params.sId);
    const exists = store.projectStudents.some(
      (ps) => ps.projectId === projectId && ps.studentId === studentId,
    );
    if (!exists) {
      res.status(404).json({ error: 'Assignment not found' });
      return;
    }
    await psService.unassign(projectId, studentId);
    res.status(204).send();
  });

  return router;
}
