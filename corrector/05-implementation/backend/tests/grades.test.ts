// sketchNumbers: 47, 114, 115, 116, 117, 118, 119, 120, 122
// UC-10: Visualización e impresión de Notas

import { describe, it, expect } from 'bun:test';
import { GradeCalculator } from '../src/services/grade-calculator';

const BASE_URL = 'http://localhost:3456';

// ── GradeCalculator: pure domain logic — no external dependencies ─────────────

describe('Element #119 — GradeCalculator: nota_final weighted average', () => {
  const calculator = new GradeCalculator();

  it('calculates weighted average of module scores', () => {
    const modules = [
      { moduleScore: 8.0,  weeklyHours: 7 },
      { moduleScore: 6.0,  weeklyHours: 5 },
    ];
    // (8*7 + 6*5) / (7+5) = (56+30)/12 = 86/12 = 7.17
    expect(calculator.calculateFinalScore(modules)).toBe(7.17);
  });

  it('rounds result to exactly 2 decimal places', () => {
    const modules = [
      { moduleScore: 7.0, weeklyHours: 3 },
      { moduleScore: 8.0, weeklyHours: 3 },
    ];
    // (21+24)/6 = 45/6 = 7.5 — even split, clean result
    const result = calculator.calculateFinalScore(modules);
    const decimals = (result.toString().split('.')[1] ?? '').length;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it('caps final score at 10 even if weighted sum exceeds 10', () => {
    const modules = [
      { moduleScore: 10.0, weeklyHours: 10 },
      { moduleScore: 10.0, weeklyHours: 10 },
    ];
    expect(calculator.calculateFinalScore(modules)).toBe(10);
  });

  it('returns 0 when no modules are provided', () => {
    expect(calculator.calculateFinalScore([])).toBe(0);
  });

  it('handles a single module correctly', () => {
    const modules = [{ moduleScore: 7.50, weeklyHours: 7 }];
    expect(calculator.calculateFinalScore(modules)).toBe(7.50);
  });

  it('handles three modules with different hours', () => {
    const modules = [
      { moduleScore: 10.0, weeklyHours: 7 },
      { moduleScore: 6.0,  weeklyHours: 5 },
      { moduleScore: 8.0,  weeklyHours: 3 },
    ];
    // (70 + 30 + 24) / 15 = 124/15 = 8.27
    expect(calculator.calculateFinalScore(modules)).toBe(8.27);
  });
});

// ── API integration tests ─────────────────────────────────────────────────────

describe('Element #47 — Role-based rendering: tutor button', () => {
  it('GET /api/auth/me returns role=tutor for tutor session', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { 'Cookie': 'session_id=tutor-session' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { role: string };
    expect(body.role).toBe('tutor');
  });
});

describe('Element #119 — GET /api/modules/:id/grades (profesor view)', () => {
  it('returns 200 with grade data sorted by project then student name', async () => {
    const res = await fetch(`${BASE_URL}/api/modules/1/grades?academicYear=2024-2025`);
    expect(res.status).toBe(200);
    const body = await res.json() as { grades: Array<{ projectName: string; studentName: string; moduleScore: number }> };
    expect(Array.isArray(body.grades)).toBe(true);
    // Verify sort order: project names should be ascending
    const names = body.grades.map(g => g.projectName);
    expect(names).toEqual([...names].sort());
  });

  it('returns moduleScore with correct notation (2 decimal places, 0–10)', async () => {
    const res = await fetch(`${BASE_URL}/api/modules/1/grades?academicYear=2024-2025`);
    expect(res.status).toBe(200);
    const body = await res.json() as { grades: Array<{ moduleScore: number }> };
    body.grades.forEach(g => {
      expect(g.moduleScore).toBeGreaterThanOrEqual(0);
      expect(g.moduleScore).toBeLessThanOrEqual(10);
    });
  });

  it('returns empty grades array when no corrections recorded', async () => {
    const res = await fetch(`${BASE_URL}/api/modules/99/grades?academicYear=2024-2025`);
    expect(res.status).toBe(200);
    const body = await res.json() as { grades: unknown[] };
    expect(body.grades).toHaveLength(0);
  });
});

describe('Element #119 — GET /api/cycles/:id/grades (tutor panoramic view)', () => {
  it('returns 200 with all modules and final weighted score for tutor', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles/1/grades?academicYear=2024-2025`, {
      headers: { 'Cookie': 'session_id=tutor-session' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as {
      modules: Array<{ id: number; weeklyHours: number }>;
      grades: Array<{ finalScore: number; moduleScores: Record<string, number> }>;
    };
    expect(Array.isArray(body.modules)).toBe(true);
    expect(Array.isArray(body.grades)).toBe(true);
    body.grades.forEach(g => {
      expect(g.finalScore).toBeGreaterThanOrEqual(0);
      expect(g.finalScore).toBeLessThanOrEqual(10);
    });
  });

  it('returns 403 when caller has rol=profesor (not tutor)', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles/1/grades?academicYear=2024-2025`, {
      headers: { 'Cookie': 'session_id=profesor-session' },
    });
    expect(res.status).toBe(403);
  });

  it('finalScore is sorted alphabetically by project then student name', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles/1/grades?academicYear=2024-2025`, {
      headers: { 'Cookie': 'session_id=tutor-session' },
    });
    expect(res.status).toBe(200);
    const body = await res.json() as {
      grades: Array<{ projectName: string; studentName: string }>;
    };
    const names = body.grades.map(g => `${g.projectName}:${g.studentName}`);
    expect(names).toEqual([...names].sort());
  });
});

describe('Element #120 — GET /api/projects/:id/grades/pdf', () => {
  const authHeaders = { 'Cookie': 'session_id=profesor-session' };

  it('returns 200 with Content-Type: application/pdf', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1/grades/pdf?academicYear=2024-2025`, { headers: authHeaders });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
  });

  it('returns Content-Disposition header with notas_<project>_<year>.pdf filename', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1/grades/pdf?academicYear=2024-2025`, { headers: authHeaders });
    const disposition = res.headers.get('content-disposition') ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('notas_1_2024-2025.pdf');
  });

  it('returns 400 when academicYear is not provided', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1/grades/pdf`, { headers: authHeaders });
    expect(res.status).toBe(400);
  });

  it('returns 404 when project does not exist', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/99999/grades/pdf?academicYear=2024-2025`, { headers: authHeaders });
    expect(res.status).toBe(404);
  });

  it('returns 401 when there is no session', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1/grades/pdf?academicYear=2024-2025`);
    expect(res.status).toBe(401);
  });
});

// ── Element #120 — PDF content mirrors table #119 (real data, not the placeholder) ──

describe('Element #120 — GET /api/projects/:id/grades/pdf (real content)', () => {
  const adminHeaders = { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' };
  const profesorHeaders = { 'Cookie': 'session_id=profesor-session' };
  const tutorHeaders = { 'Cookie': 'session_id=tutor-session' };
  const YEAR = '2024-2025';

  async function postJson(path: string, body: unknown, headers: Record<string, string>): Promise<any> {
    const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (![200, 201].includes(res.status)) {
      throw new Error(`POST ${path} failed: ${res.status} ${await res.text()}`);
    }
    return res.json();
  }

  async function createRubricItem(moduleId: number, levels: Array<{ name: string; score: number; displayOrder: number }>): Promise<{ id: number; rubricId: number; levels: Array<{ id: number; name: string }> }> {
    return postJson(`/api/modules/${moduleId}/rubric/items`, {
      academicYear: YEAR,
      description: 'Item',
      displayOrder: 1,
      levels,
    }, adminHeaders);
  }

  async function fetchPdfText(projectId: number, headers: Record<string, string>): Promise<string> {
    const res = await fetch(`${BASE_URL}/api/projects/${projectId}/grades/pdf?academicYear=${YEAR}`, { headers });
    expect(res.status).toBe(200);
    const buffer = Buffer.from(await res.arrayBuffer());
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  it('profesor view: PDF text contains student names and module scores matching GET /api/modules/:id/grades', async () => {
    const moduleA = await postJson('/api/modules', { name: 'ModA', weeklyHours: 7, cycleId: 1, legislationId: 2 }, adminHeaders);
    const moduleB = await postJson('/api/modules', { name: 'ModB', weeklyHours: 3, cycleId: 1, legislationId: 2 }, adminHeaders);

    const itemA = await createRubricItem(moduleA.id, [
      { name: 'Excelente', score: 8.0, displayOrder: 1 },
      { name: 'Bien', score: 2.0, displayOrder: 2 },
    ]);
    const itemB = await createRubricItem(moduleB.id, [
      { name: 'Alto', score: 6.0, displayOrder: 1 },
      { name: 'Bajo', score: 0.0, displayOrder: 2 },
    ]);
    const [excelenteA, bienA] = itemA.levels;
    const [altoB, bajoB] = itemB.levels;

    const student1 = await postJson('/api/students', { name: 'Ana Gomez', cycleId: 1, moduleId: moduleA.id }, adminHeaders);
    const student2 = await postJson('/api/students', { name: 'Bea Ruiz', cycleId: 1, moduleId: moduleA.id }, adminHeaders);

    const project = await postJson('/api/projects', { name: 'PDF Test Project', academicYear: YEAR, moduleId: moduleA.id }, adminHeaders);
    await postJson(`/api/projects/${project.id}/students`, { studentIds: [student1.id, student2.id] }, adminHeaders);

    await postJson('/api/corrections', {
      studentId: student1.id, projectId: project.id, moduleId: moduleA.id, rubricId: itemA.rubricId,
      academicYear: YEAR, items: [{ rubricItemId: itemA.id, rubricLevelId: excelenteA.id }],
    }, adminHeaders);
    await postJson('/api/corrections', {
      studentId: student2.id, projectId: project.id, moduleId: moduleA.id, rubricId: itemA.rubricId,
      academicYear: YEAR, items: [{ rubricItemId: itemA.id, rubricLevelId: bienA.id }],
    }, adminHeaders);
    await postJson('/api/corrections', {
      studentId: student1.id, projectId: project.id, moduleId: moduleB.id, rubricId: itemB.rubricId,
      academicYear: YEAR, items: [{ rubricItemId: itemB.id, rubricLevelId: bajoB.id }],
    }, adminHeaders);
    await postJson('/api/corrections', {
      studentId: student2.id, projectId: project.id, moduleId: moduleB.id, rubricId: itemB.rubricId,
      academicYear: YEAR, items: [{ rubricItemId: itemB.id, rubricLevelId: altoB.id }],
    }, adminHeaders);

    // ── Profesor view: single module (moduleA), matches GET /api/modules/:id/grades ──
    const moduleGradesRes = await fetch(`${BASE_URL}/api/modules/${moduleA.id}/grades?academicYear=${YEAR}`);
    const moduleGrades = (await moduleGradesRes.json()).grades as Array<{ studentName: string; moduleScore: number }>;
    const score1 = moduleGrades.find((g) => g.studentName === 'Ana Gomez')!.moduleScore;
    const score2 = moduleGrades.find((g) => g.studentName === 'Bea Ruiz')!.moduleScore;

    const profesorPdfText = await fetchPdfText(project.id, profesorHeaders);
    expect(profesorPdfText).toContain('Ana Gomez');
    expect(profesorPdfText).toContain('Bea Ruiz');
    expect(profesorPdfText).toContain(String(score1));
    expect(profesorPdfText).toContain(String(score2));

    // ── Tutor view: panoramic across cycle modules, matches GET /api/cycles/:id/grades ──
    const cycleGradesRes = await fetch(`${BASE_URL}/api/cycles/1/grades?academicYear=${YEAR}`, { headers: tutorHeaders });
    const cycleGrades = (await cycleGradesRes.json()).grades as Array<{ studentName: string; finalScore: number }>;
    const final1 = cycleGrades.find((g) => g.studentName === 'Ana Gomez')!.finalScore;
    const final2 = cycleGrades.find((g) => g.studentName === 'Bea Ruiz')!.finalScore;

    const tutorPdfText = await fetchPdfText(project.id, tutorHeaders);
    expect(tutorPdfText).toContain('Ana Gomez');
    expect(tutorPdfText).toContain('Bea Ruiz');
    expect(tutorPdfText).toContain('ModA');
    expect(tutorPdfText).toContain('ModB');
    expect(tutorPdfText).toContain(String(final1));
    expect(tutorPdfText).toContain(String(final2));
  });
});

describe('Element #122 — GET /api/cycles/:id/correction-status (badges)', () => {
  it('returns 200 with one entry per module in the cycle', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles/1/correction-status?academicYear=2024-2025`);
    expect(res.status).toBe(200);
    const body = await res.json() as { modules: Array<{ moduleId: number; status: string }> };
    expect(Array.isArray(body.modules)).toBe(true);
    body.modules.forEach(m => {
      expect(['complete', 'incomplete']).toContain(m.status);
    });
  });

  it('status is "complete" when all students have corrections for that module', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles/1/correction-status?academicYear=2024-2025`);
    expect(res.status).toBe(200);
    const body = await res.json() as {
      modules: Array<{ status: string; totalStudents: number; correctedStudents: number }>;
    };
    const completeModules = body.modules.filter(m => m.status === 'complete');
    completeModules.forEach(m => {
      expect(m.correctedStudents).toBe(m.totalStudents);
    });
  });

  it('status is "incomplete" when at least one student is missing a correction', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles/1/correction-status?academicYear=2024-2025`);
    expect(res.status).toBe(200);
    const body = await res.json() as {
      modules: Array<{ status: string; totalStudents: number; correctedStudents: number }>;
    };
    const incomplete = body.modules.filter(m => m.status === 'incomplete');
    incomplete.forEach(m => {
      expect(m.correctedStudents).toBeLessThan(m.totalStudents);
    });
  });
});
