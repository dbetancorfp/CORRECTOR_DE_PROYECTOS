// sketchNumbers: 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113
// UC-09: Corrección de Proyecto

import { describe, it, expect } from 'bun:test';
import { ScoreCalculator } from '../src/services/score-calculator';
import { CorrectionService } from '../src/services/correction.service';
import type { CorrectionRepository } from '../src/repositories/correction.repository';
import type { RubricRepository } from '../src/repositories/rubric.repository';

const BASE_URL = 'http://localhost:3000';

// ── ScoreCalculator: pure domain logic — no external dependencies ─────────────

describe('Elements #112 #113 — ScoreCalculator: raw score and normalised score', () => {
  const calculator = new ScoreCalculator();

  it('calculateRaw returns sum of selected level scores', () => {
    const selections = [
      { selectedScore: 3.0 },
      { selectedScore: 2.0 },
      { selectedScore: 0.0 },
    ];
    expect(calculator.calculateRaw(selections)).toBe(5.0);
  });

  it('calculateRaw returns 0 when no levels selected', () => {
    expect(calculator.calculateRaw([])).toBe(0);
  });

  it('calculateNormalised applies formula (obtained / max) × 10 rounded to 2 decimals', () => {
    expect(calculator.calculateNormalised(7.5, 10.0)).toBe(7.5);
    expect(calculator.calculateNormalised(3.0, 6.0)).toBe(5.0);
    expect(calculator.calculateNormalised(7.0, 9.0)).toBe(7.78);
  });

  it('calculateNormalised returns 0 when no points obtained', () => {
    expect(calculator.calculateNormalised(0, 10.0)).toBe(0);
  });

  it('calculateNormalised handles max=0 without throwing (edge case: empty rubric)', () => {
    expect(() => calculator.calculateNormalised(0, 0)).not.toThrow();
  });

  it('calculateNormalised result is always rounded to exactly 2 decimal places', () => {
    const result = calculator.calculateNormalised(1, 3);
    const decimalStr = result.toString().split('.')[1] ?? '';
    expect(decimalStr.length).toBeLessThanOrEqual(2);
  });
});

// ── Domain doubles for CorrectionService ─────────────────────────────────────

const rubric = {
  id: 1,
  moduleId: 1,
  academicYear: '2024-2025',
  frozen: false,
  items: [
    { id: 1, description: 'Diseño', displayOrder: 1, levels: [
      { id: 1, name: 'Excelente', score: 5.0, displayOrder: 1 },
      { id: 2, name: 'Bien',      score: 3.0, displayOrder: 2 },
      { id: 3, name: 'Mal',       score: 0.0, displayOrder: 3 },
    ]},
    { id: 2, description: 'Documentación', displayOrder: 2, levels: [
      { id: 4, name: 'Excelente', score: 5.0, displayOrder: 1 },
      { id: 5, name: 'Bien',      score: 3.0, displayOrder: 2 },
      { id: 6, name: 'Mal',       score: 0.0, displayOrder: 3 },
    ]},
  ],
};

function makeRubricRepo(overrides: Partial<RubricRepository> = {}): RubricRepository {
  return {
    findByModule: async () => rubric,
    addItem: async () => rubric.items[0],
    updateItem: async () => rubric.items[0],
    deleteItem: async () => {},
    isFrozen: async () => false,
    getExcelenteSumExcluding: async () => 0,
    replaceAll: async () => {},
    ...overrides,
  };
}

function makeCorrectionRepo(overrides: Partial<CorrectionRepository> = {}): CorrectionRepository {
  return {
    findByStudentAndProject: async () => null,
    upsert: async (data) => ({
      id: 1,
      studentId: data.studentId,
      moduleId: data.moduleId,
      rubricId: data.rubricId,
      finalScore: 8.0,
      items: data.items,
    }),
    ...overrides,
  };
}

// ── Element #110/#111 — CorrectionService: auto-save ─────────────────────────

describe('Elements #110 #111 — CorrectionService: upsert correction', () => {
  it('creates correction with final_score calculated server-side', async () => {
    const correctionRepo = makeCorrectionRepo();
    const rubricRepo = makeRubricRepo();
    const service = new CorrectionService(correctionRepo, rubricRepo, new ScoreCalculator());
    const result = await service.upsert({
      studentId: 1,
      projectId: 1,
      moduleId: 1,
      rubricId: 1,
      academicYear: '2024-2025',
      items: [
        { rubricItemId: 1, rubricLevelId: 1 }, // Excelente 5.0
        { rubricItemId: 2, rubricLevelId: 4 }, // Excelente 5.0
      ],
    });
    // (10 / 10) × 10 = 10.00
    expect(result.finalScore).toBe(10.0);
  });

  it('throws when not all rubric items have a selection', async () => {
    const rubricRepo = makeRubricRepo();
    const service = new CorrectionService(makeCorrectionRepo(), rubricRepo, new ScoreCalculator());
    await expect(service.upsert({
      studentId: 1,
      projectId: 1,
      moduleId: 1,
      rubricId: 1,
      academicYear: '2024-2025',
      items: [
        { rubricItemId: 1, rubricLevelId: 1 }, // only 1 of 2 items
      ],
    })).rejects.toMatchObject({ code: 'INCOMPLETE_SELECTION' });
  });

  it('throws when rubricLevelId does not belong to rubricItemId', async () => {
    const rubricRepo = makeRubricRepo();
    const service = new CorrectionService(makeCorrectionRepo(), rubricRepo, new ScoreCalculator());
    await expect(service.upsert({
      studentId: 1,
      projectId: 1,
      moduleId: 1,
      rubricId: 1,
      academicYear: '2024-2025',
      items: [
        { rubricItemId: 1, rubricLevelId: 4 }, // level 4 belongs to item 2, not item 1
        { rubricItemId: 2, rubricLevelId: 1 }, // level 1 belongs to item 1, not item 2
      ],
    })).rejects.toMatchObject({ code: 'INVALID_LEVEL_ASSIGNMENT' });
  });

  it('returns existing correction pre-loaded when one exists for student+project', async () => {
    const existingCorrection = {
      id: 1,
      studentId: 1,
      moduleId: 1,
      rubricId: 1,
      finalScore: 7.0,
      items: [{ rubricItemId: 1, rubricLevelId: 2 }, { rubricItemId: 2, rubricLevelId: 5 }],
    };
    const correctionRepo = makeCorrectionRepo({
      findByStudentAndProject: async () => existingCorrection,
    });
    const service = new CorrectionService(correctionRepo, makeRubricRepo(), new ScoreCalculator());
    const found = await service.findExisting(1, 1);
    expect(found?.id).toBe(1);
    expect(found?.finalScore).toBe(7.0);
  });

  it('upserts (overwrites) existing correction for same student+project', async () => {
    let upsertCalled = false;
    const correctionRepo = makeCorrectionRepo({
      upsert: async (data) => { upsertCalled = true; return { id: 1, ...data, finalScore: 5.0 }; },
    });
    const service = new CorrectionService(correctionRepo, makeRubricRepo(), new ScoreCalculator());
    await service.upsert({
      studentId: 1,
      projectId: 1,
      moduleId: 1,
      rubricId: 1,
      academicYear: '2024-2025',
      items: [
        { rubricItemId: 1, rubricLevelId: 1 },
        { rubricItemId: 2, rubricLevelId: 4 },
      ],
    });
    expect(upsertCalled).toBe(true);
  });
});

// ── Element #104 — Module without rubric blocks correction ───────────────────

describe('Element #104 — CorrectionService: blocks correction when module has no rubric', () => {
  it('throws NO_RUBRIC when the module has no rubric defined', async () => {
    const rubricRepo = makeRubricRepo({ findByModule: async () => null });
    const service = new CorrectionService(makeCorrectionRepo(), rubricRepo, new ScoreCalculator());
    await expect(service.upsert({
      studentId: 1,
      projectId: 1,
      moduleId: 99,
      rubricId: 1,
      academicYear: '2024-2025',
      items: [],
    })).rejects.toMatchObject({ code: 'NO_RUBRIC' });
  });
});

// ── API integration tests ─────────────────────────────────────────────────────

describe('Elements #110 #111 — GET /api/corrections', () => {
  it('returns 200 with existing correction for student+project', async () => {
    const res = await fetch(`${BASE_URL}/api/corrections?studentId=1&projectId=1`);
    expect(res.status).toBe(200);
  });

  it('returns null in body when no correction exists', async () => {
    const res = await fetch(`${BASE_URL}/api/corrections?studentId=9999&projectId=9999`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeNull();
  });
});

describe('Elements #110 #111 — POST /api/corrections', () => {
  it('returns 200 or 201 with correction and calculated finalScore', async () => {
    const res = await fetch(`${BASE_URL}/api/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 1,
        projectId: 1,
        moduleId: 1,
        rubricId: 1,
        academicYear: '2024-2025',
        items: [
          { rubricItemId: 1, rubricLevelId: 1 },
          { rubricItemId: 2, rubricLevelId: 4 },
        ],
      }),
    });
    expect([200, 201]).toContain(res.status);
    const body = await res.json() as { finalScore: number };
    expect(typeof body.finalScore).toBe('number');
    expect(body.finalScore).toBeGreaterThanOrEqual(0);
    expect(body.finalScore).toBeLessThanOrEqual(10);
  });

  it('returns 400 when not all rubric items are covered', async () => {
    const res = await fetch(`${BASE_URL}/api/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: 1,
        projectId: 1,
        moduleId: 1,
        rubricId: 1,
        academicYear: '2024-2025',
        items: [], // empty — missing all items
      }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 403 when teacher is not the assigned professor of the module', async () => {
    const res = await fetch(`${BASE_URL}/api/corrections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=other-teacher-session' },
      body: JSON.stringify({
        studentId: 1,
        projectId: 1,
        moduleId: 1,
        rubricId: 1,
        academicYear: '2024-2025',
        items: [{ rubricItemId: 1, rubricLevelId: 1 }],
      }),
    });
    expect(res.status).toBe(403);
  });
});
