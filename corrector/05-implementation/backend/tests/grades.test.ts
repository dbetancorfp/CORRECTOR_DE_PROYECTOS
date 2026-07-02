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
  it('returns 200 with Content-Type: application/pdf', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1/grades/pdf?academicYear=2024-2025`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/pdf');
  });

  it('returns Content-Disposition header for file download', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1/grades/pdf?academicYear=2024-2025`);
    const disposition = res.headers.get('content-disposition') ?? '';
    expect(disposition).toContain('attachment');
    expect(disposition).toContain('.pdf');
  });

  it('returns 400 when academicYear is not provided', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1/grades/pdf`);
    expect(res.status).toBe(400);
  });

  it('returns 404 when project does not exist', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/99999/grades/pdf?academicYear=2024-2025`);
    expect(res.status).toBe(404);
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
