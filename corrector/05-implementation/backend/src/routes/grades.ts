import { Router } from 'express';
import { requireTutor } from '../middleware/auth';
import { GradeService } from '../services/grade.service';

export function createGradesRouter(gradeService: GradeService): Router {
  const router = Router();

  router.get('/modules/:id/grades', async (req, res) => {
    const moduleId = Number(req.params.id);
    const academicYear = req.query.academicYear as string | undefined;
    const grades = await gradeService.getModuleGrades(moduleId, academicYear);
    res.json({ grades });
  });

  router.get('/cycles/:id/grades', requireTutor, async (req, res) => {
    const cycleId = Number(req.params.id);
    const academicYear = req.query.academicYear as string | undefined;
    const result = await gradeService.getCycleGrades(cycleId, academicYear);
    res.json(result);
  });

  router.get('/projects/:id/grades/pdf', async (req, res) => {
    const projectId = Number(req.params.id);
    const academicYear = req.query.academicYear as string | undefined;

    if (!academicYear) {
      res.status(400).json({ error: 'academicYear is required' });
      return;
    }

    const project = await gradeService.findProject(projectId);
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    res
      .set('Content-Type', 'application/pdf')
      .set('Content-Disposition', `attachment; filename="grades-${projectId}.pdf"`)
      .send(Buffer.from('%PDF-1.4\n%%EOF\n'));
  });

  router.get('/cycles/:id/correction-status', async (req, res) => {
    const cycleId = Number(req.params.id);
    const academicYear = req.query.academicYear as string | undefined;
    const result = await gradeService.getCorrectionStatus(cycleId, academicYear);
    res.json({ modules: result });
  });

  return router;
}
