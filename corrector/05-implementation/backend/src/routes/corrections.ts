import { Router } from 'express';
import type { CorrectionRepository } from '../repositories/correction.repository';
import type { RubricRepository } from '../repositories/rubric.repository';
import type { ModuleRepository } from '../repositories/module.repository';
import { CorrectionService } from '../services/correction.service';
import { ScoreCalculator } from '../services/score-calculator';
import { requireAuth } from '../middleware/auth';
import { mapError } from './error';

export function createCorrectionsRouter(
  corrRepo: CorrectionRepository,
  rubricRepo: RubricRepository,
  moduleRepo: ModuleRepository,
): Router {
  const router = Router();
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

  router.post('/', requireAuth, async (req, res) => {
    const { studentId, projectId, moduleId, rubricId, academicYear, items } = req.body as {
      studentId?: number;
      projectId?: number;
      moduleId?: number;
      rubricId?: number;
      academicYear?: string;
      items?: Array<{ rubricItemId: number; rubricLevelId: number }>;
    };

    const user = req.user!;
    if (user.role !== 'admin') {
      const assigned = await moduleRepo.isTeacherAssigned(user.id, moduleId ?? 0);
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
        teacherId: user.id,
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
