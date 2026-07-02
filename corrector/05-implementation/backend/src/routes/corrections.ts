import { Router } from 'express';
import type { Store } from '../repositories/in-memory/store';
import { InMemoryCorrectionRepository } from '../repositories/in-memory/in-memory-correction.repository';
import { InMemoryRubricRepository } from '../repositories/in-memory/in-memory-rubric.repository';
import { CorrectionService } from '../services/correction.service';
import { ScoreCalculator } from '../services/score-calculator';
import { mapError } from './error';

export function createCorrectionsRouter(store: Store): Router {
  const router = Router();
  const corrRepo = new InMemoryCorrectionRepository(store);
  const rubricRepo = new InMemoryRubricRepository(store);
  const calculator = new ScoreCalculator();
  const service = new CorrectionService(corrRepo, rubricRepo, calculator);

  router.get('/', async (req, res) => {
    const studentId = req.query.studentId !== undefined ? Number(req.query.studentId) : undefined;
    const projectId = req.query.projectId !== undefined ? Number(req.query.projectId) : undefined;
    if (studentId === undefined || projectId === undefined) {
      res.status(400).json({ error: 'studentId and projectId are required' });
      return;
    }
    const result = await service.findExisting(studentId, projectId);
    res.json(result);
  });

  router.post('/', async (req, res) => {
    const { studentId, projectId, moduleId, rubricId, academicYear, items } = req.body as {
      studentId?: number;
      projectId?: number;
      moduleId?: number;
      rubricId?: number;
      academicYear?: string;
      items?: Array<{ rubricItemId: number; rubricLevelId: number }>;
    };

    const user = req.user;
    if (user && user.role !== 'admin') {
      const assigned = store.moduleTeachers.some(
        (mt) => mt.teacherId === user.id && mt.moduleId === moduleId,
      );
      if (!assigned) {
        res.status(403).json({ error: 'Not assigned to this module' });
        return;
      }
    }

    try {
      const result = await service.upsert({
        studentId: studentId ?? 0,
        projectId: projectId ?? 0,
        moduleId: moduleId ?? 0,
        rubricId: rubricId ?? 0,
        academicYear: academicYear ?? '',
        items: items ?? [],
      });
      res.status(201).json(result);
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  return router;
}
