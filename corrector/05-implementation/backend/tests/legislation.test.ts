// sketchNumbers: 4, 5, 6, 7, 8, 9, 10
// UC-02: Gestión de Legislaciones

import { describe, it, expect } from 'bun:test';
import { LegislationService } from '../src/services/legislation.service';
import type { LegislationRepository } from '../src/repositories/legislation.repository';

const BASE_URL = 'http://localhost:3456';

// ── Domain doubles ────────────────────────────────────────────────────────────

const baseLegislation = { id: 1, name: 'LOMLOE', startYear: 2020 };

function makeRepo(overrides: Partial<LegislationRepository> = {}): LegislationRepository {
  return {
    findAll: async () => [baseLegislation],
    findById: async () => baseLegislation,
    findByName: async () => null,
    create: async (name, startYear) => ({ id: 2, name, startYear }),
    update: async () => baseLegislation,
    delete: async () => {},
    hasModules: async () => false,
    ...overrides,
  };
}

// ── Element #5 — Siglas validation ───────────────────────────────────────────

describe('Element #5 — LegislationService: siglas field validation', () => {
  it('accepts valid uppercase abbreviation (2–10 chars)', async () => {
    const service = new LegislationService(makeRepo());
    const result = await service.create('LOE', 2006);
    expect(result.name).toBe('LOE');
  });

  it('throws when siglas is empty', async () => {
    const service = new LegislationService(makeRepo());
    await expect(service.create('', 2020)).rejects.toThrow();
  });

  it('throws when siglas contains lowercase letters', async () => {
    const service = new LegislationService(makeRepo());
    await expect(service.create('lomloe', 2020)).rejects.toThrow();
  });

  it('throws when siglas is shorter than 2 characters', async () => {
    const service = new LegislationService(makeRepo());
    await expect(service.create('L', 2020)).rejects.toThrow();
  });

  it('throws when siglas is longer than 10 characters', async () => {
    const service = new LegislationService(makeRepo());
    await expect(service.create('TOOLONGNAME', 2020)).rejects.toThrow();
  });

  it('throws when siglas already exists (409)', async () => {
    const repo = makeRepo({
      findByName: async () => baseLegislation,
    });
    const service = new LegislationService(repo);
    await expect(service.create('LOMLOE', 2020)).rejects.toMatchObject({
      code: 'DUPLICATE',
    });
  });
});

// ── Element #6 — Start year validation ───────────────────────────────────────

describe('Element #6 — LegislationService: start year validation', () => {
  it('accepts valid year within 1900–2099', async () => {
    const service = new LegislationService(makeRepo());
    const result = await service.create('LOE', 2006);
    expect(result.startYear).toBe(2006);
  });

  it('throws when year is below 1900', async () => {
    const service = new LegislationService(makeRepo());
    await expect(service.create('LOE', 1899)).rejects.toThrow();
  });

  it('throws when year is above 2099', async () => {
    const service = new LegislationService(makeRepo());
    await expect(service.create('LOE', 2100)).rejects.toThrow();
  });

  it('throws when year is not provided', async () => {
    const service = new LegislationService(makeRepo());
    await expect(service.create('LOE', undefined as unknown as number)).rejects.toThrow();
  });
});

// ── Element #7 — Guardar: create legislación ─────────────────────────────────

describe('Element #7 — LegislationService: create', () => {
  it('persists legislation and returns new entity', async () => {
    const persisted: Array<{ name: string; startYear: number }> = [];
    const repo = makeRepo({
      create: async (name, startYear) => {
        persisted.push({ name, startYear });
        return { id: 99, name, startYear };
      },
    });
    const service = new LegislationService(repo);
    const result = await service.create('LOE', 2006);
    expect(persisted[0]).toEqual({ name: 'LOE', startYear: 2006 });
    expect(result.id).toBe(99);
  });
});

// ── Elements #8 & #9 — Reactive filters (service layer) ──────────────────────

describe('Elements #8 #9 — LegislationService: list with filters', () => {
  it('returns all legislations when no filter applied', async () => {
    const service = new LegislationService(makeRepo());
    const results = await service.list({});
    expect(results.length).toBeGreaterThan(0);
  });

  it('passes year filter to repository', async () => {
    let calledWith: unknown;
    const repo = makeRepo({
      findAll: async (filters) => { calledWith = filters; return []; },
    });
    const service = new LegislationService(repo);
    await service.list({ year: 2020 });
    expect((calledWith as { year?: number }).year).toBe(2020);
  });

  it('passes name filter to repository (case-insensitive substring)', async () => {
    let calledWith: unknown;
    const repo = makeRepo({
      findAll: async (filters) => { calledWith = filters; return []; },
    });
    const service = new LegislationService(repo);
    await service.list({ name: 'loe' });
    expect((calledWith as { name?: string }).name).toBeDefined();
  });
});

// ── Element #10 — Tabla: edit and delete ─────────────────────────────────────

describe('Element #10 — LegislationService: update', () => {
  it('updates and returns modified legislation', async () => {
    const repo = makeRepo({
      update: async () => ({ id: 1, name: 'LOE', startYear: 2007 }),
    });
    const service = new LegislationService(repo);
    const result = await service.update(1, { name: 'LOE', startYear: 2007 });
    expect(result.name).toBe('LOE');
  });

  it('throws when legislation does not exist', async () => {
    const repo = makeRepo({ findById: async () => null });
    const service = new LegislationService(repo);
    await expect(service.update(999, { name: 'LOE' })).rejects.toThrow();
  });
});

describe('Element #10 — LegislationService: delete', () => {
  it('deletes legislation with no dependent modules', async () => {
    let deleted = false;
    const repo = makeRepo({ delete: async () => { deleted = true; } });
    const service = new LegislationService(repo);
    await service.delete(1);
    expect(deleted).toBe(true);
  });

  it('throws CONFLICT when legislation has dependent modules', async () => {
    const repo = makeRepo({ hasModules: async () => true });
    const service = new LegislationService(repo);
    await expect(service.delete(1)).rejects.toMatchObject({ code: 'HAS_DEPENDANTS' });
  });
});

// ── API integration tests ─────────────────────────────────────────────────────

describe('Element #7 — POST /api/legislation', () => {
  it('returns 201 with new legislation for valid input', async () => {
    const res = await fetch(`${BASE_URL}/api/legislation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'LOE', startYear: 2006 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id: number; name: string; startYear: number };
    expect(body.name).toBe('LOE');
    expect(body.startYear).toBe(2006);
    expect(body.id).toBeDefined();
  });

  it('returns 400 when name is lowercase', async () => {
    const res = await fetch(`${BASE_URL}/api/legislation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'lomloe', startYear: 2020 }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when startYear is out of range', async () => {
    const res = await fetch(`${BASE_URL}/api/legislation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'LOE', startYear: 1800 }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 403 when caller is not admin role', async () => {
    const res = await fetch(`${BASE_URL}/api/legislation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=profesor-session' },
      body: JSON.stringify({ name: 'LOE', startYear: 2006 }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 409 when name already exists', async () => {
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'LOMLOE', startYear: 2020 }),
    };
    await fetch(`${BASE_URL}/api/legislation`, opts);
    const res = await fetch(`${BASE_URL}/api/legislation`, opts);
    expect(res.status).toBe(409);
  });
});

describe('Elements #8 #9 — GET /api/legislation', () => {
  it('returns 200 with array of legislations', async () => {
    const res = await fetch(`${BASE_URL}/api/legislation`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it('filters by year query param', async () => {
    const res = await fetch(`${BASE_URL}/api/legislation?year=2020`);
    expect(res.status).toBe(200);
    const body = await res.json() as Array<{ startYear: number }>;
    body.forEach(l => expect(l.startYear).toBe(2020));
  });

  it('filters by name query param (case-insensitive substring)', async () => {
    const res = await fetch(`${BASE_URL}/api/legislation?name=loe`);
    expect(res.status).toBe(200);
    const body = await res.json() as Array<{ name: string }>;
    body.forEach(l => expect(l.name.toLowerCase()).toContain('loe'));
  });
});

describe('Element #10 — PUT /api/legislation/:id', () => {
  it('returns 200 with updated legislation', async () => {
    const res = await fetch(`${BASE_URL}/api/legislation/1`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'LOGSE', startYear: 1990 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { name: string };
    expect(body.name).toBe('LOGSE');
  });

  it('returns 404 when legislation does not exist', async () => {
    const res = await fetch(`${BASE_URL}/api/legislation/99999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'LOE' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('Element #10 — DELETE /api/legislation/:id', () => {
  it('returns 204 when legislation has no dependent modules', async () => {
    const res = await fetch(`${BASE_URL}/api/legislation/1`, {
      method: 'DELETE',
      headers: { 'Cookie': 'session_id=admin-session' },
    });
    expect(res.status).toBe(204);
  });

  it('returns 409 when legislation has dependent modules', async () => {
    // Legislation 1 (LOGSE) was just deleted by the test above (it has no
    // modules) — legislation 2 (LOMLOE) is the one with real dependents
    // (DEW/ANA/BD all reference it).
    const res = await fetch(`${BASE_URL}/api/legislation/2`, {
      method: 'DELETE',
      headers: { 'Cookie': 'session_id=admin-session' },
    });
    expect(res.status).toBe(409);
  });
});
