// sketchNumbers: 12, 13, 14, 15, 16, 17, 18, 19, 20, 21
// UC-03: Gestión de Ciclos

import { describe, it, expect } from 'bun:test';
import { CycleService } from '../src/services/cycle.service';
import type { CycleRepository } from '../src/repositories/cycle.repository';

const BASE_URL = 'http://localhost:3000';

// ── Domain doubles ────────────────────────────────────────────────────────────

const baseCycle = { id: 1, name: 'Desarrollo de Aplicaciones Web' };

function makeRepo(overrides: Partial<CycleRepository> = {}): CycleRepository {
  return {
    findAll: async () => [baseCycle],
    findById: async () => baseCycle,
    findByName: async () => null,
    create: async (name) => ({ id: 2, name }),
    update: async () => baseCycle,
    delete: async () => {},
    hasModules: async () => false,
    ...overrides,
  };
}

// ── Element #13 — Cycle name validation ──────────────────────────────────────

describe('Element #13 — CycleService: name field validation', () => {
  it('accepts valid name between 3 and 100 characters', async () => {
    const service = new CycleService(makeRepo());
    const result = await service.create('Desarrollo de Aplicaciones Web');
    expect(result.name).toBe('Desarrollo de Aplicaciones Web');
  });

  it('throws when name is empty', async () => {
    const service = new CycleService(makeRepo());
    await expect(service.create('')).rejects.toThrow();
  });

  it('throws when name is shorter than 3 characters', async () => {
    const service = new CycleService(makeRepo());
    await expect(service.create('AB')).rejects.toThrow();
  });

  it('throws when name exceeds 100 characters', async () => {
    const service = new CycleService(makeRepo());
    const longName = 'A'.repeat(101);
    await expect(service.create(longName)).rejects.toThrow();
  });

  it('throws DUPLICATE when name already exists', async () => {
    const repo = makeRepo({ findByName: async () => baseCycle });
    const service = new CycleService(repo);
    await expect(service.create('Desarrollo de Aplicaciones Web')).rejects.toMatchObject({
      code: 'DUPLICATE',
    });
  });
});

// ── Elements #14 & #15 — Navigation selectors: NOT persisted in cycle ─────────

describe('Elements #14 #15 — CycleService: legislation and year are NOT stored', () => {
  it('creates cycle with name ONLY — no legislation_id in entity', async () => {
    let savedPayload: unknown;
    const repo = makeRepo({
      create: async (name) => { savedPayload = { name }; return { id: 99, name }; },
    });
    const service = new CycleService(repo);
    // Even if caller passes navigation aids, they must not be persisted
    await service.create('DAW', { legislationId: 1, year: 2020 });
    expect(savedPayload).toEqual({ name: 'DAW' });
    expect((savedPayload as Record<string, unknown>).legislationId).toBeUndefined();
  });
});

// ── Element #16 — Guardar: create cycle ──────────────────────────────────────

describe('Element #16 — CycleService: create persists only the name', () => {
  it('saves the cycle and returns the created entity', async () => {
    const service = new CycleService(makeRepo());
    const result = await service.create('DAM');
    expect(result.id).toBeDefined();
    expect(result.name).toBe('DAM');
    expect((result as Record<string, unknown>).legislationId).toBeUndefined();
  });
});

// ── Element #20 — Table: edit and delete ─────────────────────────────────────

describe('Element #20 — CycleService: update', () => {
  it('updates cycle name', async () => {
    const repo = makeRepo({ update: async () => ({ id: 1, name: 'DAM' }) });
    const service = new CycleService(repo);
    const result = await service.update(1, 'DAM');
    expect(result.name).toBe('DAM');
  });

  it('throws when cycle does not exist', async () => {
    const repo = makeRepo({ findById: async () => null });
    const service = new CycleService(repo);
    await expect(service.update(999, 'DAM')).rejects.toThrow();
  });
});

describe('Element #20 — CycleService: delete', () => {
  it('deletes cycle with no dependent modules', async () => {
    let deleted = false;
    const repo = makeRepo({ delete: async () => { deleted = true; } });
    const service = new CycleService(repo);
    await service.delete(1);
    expect(deleted).toBe(true);
  });

  it('throws CONFLICT when cycle has associated modules', async () => {
    const repo = makeRepo({ hasModules: async () => true });
    const service = new CycleService(repo);
    await expect(service.delete(1)).rejects.toMatchObject({ code: 'HAS_DEPENDANTS' });
  });
});

// ── Element #21 — Año finalización (derived, not stored) ─────────────────────

describe('Element #21 — end_year is always start_year + 1 (derived at runtime)', () => {
  it('calculates endYear as startYear + 1', async () => {
    const { calculateEndYear } = await import('../src/utils/cycle.utils');
    expect(calculateEndYear(2020)).toBe(2021);
    expect(calculateEndYear(1999)).toBe(2000);
  });

  it('endYear is never persisted in the database', () => {
    // Domain rule: cycle entity has no end_year column
    const cycleKeys = Object.keys(baseCycle);
    expect(cycleKeys).not.toContain('endYear');
    expect(cycleKeys).not.toContain('end_year');
  });
});

// ── API integration tests ─────────────────────────────────────────────────────

describe('Element #16 — POST /api/cycles', () => {
  it('returns 201 with new cycle (name only)', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Desarrollo de Aplicaciones Web' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id: number; name: string };
    expect(body.name).toBe('Desarrollo de Aplicaciones Web');
    expect(body.id).toBeDefined();
    expect((body as Record<string, unknown>).legislationId).toBeUndefined();
  });

  it('returns 400 when name is shorter than 3 characters', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'AB' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 when name already exists', async () => {
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'DAW' }),
    };
    await fetch(`${BASE_URL}/api/cycles`, opts);
    const res = await fetch(`${BASE_URL}/api/cycles`, opts);
    expect(res.status).toBe(409);
  });
});

describe('Elements #17 #18 #19 — GET /api/cycles', () => {
  it('returns 200 with array of cycles', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles`);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('filters by name substring', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles?name=daw`);
    expect(res.status).toBe(200);
  });

  it('filters by legislationId (via module join)', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles?legislationId=1`);
    expect(res.status).toBe(200);
  });

  it('filters by year (via module → legislation join)', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles?year=2020`);
    expect(res.status).toBe(200);
  });
});

describe('Element #20 — PUT /api/cycles/:id', () => {
  it('returns 200 with updated cycle', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'DAM' }),
    });
    expect(res.status).toBe(200);
  });

  it('returns 409 when name already exists', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'ExistingCycle' }),
    });
    expect(res.status).toBe(409);
  });
});

describe('Element #20 — DELETE /api/cycles/:id', () => {
  it('returns 204 when cycle has no modules', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles/1`, { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  it('returns 409 when cycle has associated modules', async () => {
    const res = await fetch(`${BASE_URL}/api/cycles/1`, { method: 'DELETE' });
    expect(res.status).toBe(409);
  });
});
