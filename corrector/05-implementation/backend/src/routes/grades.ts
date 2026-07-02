import { Router } from 'express';
import type { Store } from '../repositories/in-memory/store';
import type { CorrectionResult } from '../repositories/correction.repository';
import { GradeCalculator } from '../services/grade-calculator';
import { requireTutor } from '../middleware/auth';

type StoredCorrection = CorrectionResult & { projectId?: number };

function correctionYear(store: Store, c: StoredCorrection): string {
  const rubric = store.rubrics.find((r) => r.id === c.rubricId);
  return rubric?.academicYear ?? '';
}

export function createGradesRouter(store: Store): Router {
  const router = Router();
  const calculator = new GradeCalculator();

  router.get('/modules/:id/grades', async (req, res) => {
    const moduleId = Number(req.params.id);
    const academicYear = req.query.academicYear as string | undefined;

    const corrections = store.corrections.filter((c) => {
      const sc = c as StoredCorrection;
      return (
        sc.moduleId === moduleId &&
        (!academicYear || correctionYear(store, sc) === academicYear)
      );
    });

    const grades = corrections.map((c) => {
      const sc = c as StoredCorrection;
      const student = store.students.find((s) => s.id === sc.studentId);
      const project = store.projects.find((p) => p.id === sc.projectId);
      return {
        studentName: student?.name ?? '',
        projectName: project?.name ?? '',
        moduleScore: sc.finalScore,
      };
    });

    grades.sort((a, b) => {
      const p = a.projectName.localeCompare(b.projectName);
      return p !== 0 ? p : a.studentName.localeCompare(b.studentName);
    });

    res.json({ grades });
  });

  router.get('/cycles/:id/grades', requireTutor, async (req, res) => {
    const cycleId = Number(req.params.id);
    const academicYear = req.query.academicYear as string | undefined;

    const modules = store.modules.filter((m) => m.cycleId === cycleId);

    const relevant = store.corrections.filter((c) => {
      const sc = c as StoredCorrection;
      return (
        modules.some((m) => m.id === sc.moduleId) &&
        (!academicYear || correctionYear(store, sc) === academicYear)
      );
    });

    const studentMap = new Map<
      number,
      { studentName: string; projectName: string; moduleScores: Record<string, number> }
    >();

    for (const c of relevant) {
      const sc = c as StoredCorrection;
      const student = store.students.find((s) => s.id === sc.studentId);
      const project = store.projects.find((p) => p.id === sc.projectId);
      if (!studentMap.has(sc.studentId)) {
        studentMap.set(sc.studentId, {
          studentName: student?.name ?? '',
          projectName: project?.name ?? '',
          moduleScores: {},
        });
      }
      const entry = studentMap.get(sc.studentId)!;
      entry.moduleScores[String(sc.moduleId)] = sc.finalScore;
    }

    const grades = Array.from(studentMap.values()).map((entry) => {
      const moduleGrades = modules.map((m) => ({
        moduleScore: entry.moduleScores[String(m.id)] ?? 0,
        weeklyHours: m.weeklyHours,
      }));
      return { ...entry, finalScore: calculator.calculateFinalScore(moduleGrades) };
    });

    grades.sort((a, b) => {
      const p = a.projectName.localeCompare(b.projectName);
      return p !== 0 ? p : a.studentName.localeCompare(b.studentName);
    });

    res.json({
      modules: modules.map((m) => ({ id: m.id, name: m.name, weeklyHours: m.weeklyHours })),
      grades,
    });
  });

  router.get('/projects/:id/grades/pdf', async (req, res) => {
    const projectId = Number(req.params.id);
    const academicYear = req.query.academicYear as string | undefined;

    if (!academicYear) {
      res.status(400).json({ error: 'academicYear is required' });
      return;
    }

    const project = store.projects.find((p) => p.id === projectId);
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

    const modules = store.modules.filter((m) => m.cycleId === cycleId);

    const result = modules.map((m) => {
      const projectIds = store.projects
        .filter((p) => p.moduleId === m.id)
        .map((p) => p.id);

      const studentIds = [
        ...new Set(
          store.projectStudents
            .filter((ps) => projectIds.includes(ps.projectId))
            .map((ps) => ps.studentId),
        ),
      ];

      const correctedIds = store.corrections
        .filter((c) => {
          const sc = c as StoredCorrection;
          return (
            sc.moduleId === m.id &&
            (!academicYear || correctionYear(store, sc) === academicYear) &&
            studentIds.includes(sc.studentId)
          );
        })
        .map((c) => c.studentId);

      const totalStudents = studentIds.length;
      const correctedStudents = new Set(correctedIds).size;
      const status = correctedStudents >= totalStudents ? 'complete' : 'incomplete';

      return { moduleId: m.id, moduleName: m.name, totalStudents, correctedStudents, status };
    });

    res.json({ modules: result });
  });

  return router;
}
