// sketchNumbers: 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33
// UC-04: Gestión de Módulos

import { describe, it, expect } from 'bun:test';
import { ModuleService } from '../src/services/module.service';
import type { ModuleRepository } from '../src/repositories/module.repository';

const BASE_URL = 'http://localhost:3456';

// ── Domain doubles ────────────────────────────────────────────────────────────

const baseModule = {
  id: 1,
  name: 'Desarrollo Web en Entorno Cliente',
  weeklyHours: 7,
  cycleId: 1,
  cycleName: 'DAW',
  legislationId: 1,
  legislationName: 'LOMLOE',
};

function makeRepo(overrides: Partial<ModuleRepository> = {}): ModuleRepository {
  return {
    findAll: async () => [baseModule],
    findById: async () => baseModule,
    findByNameAndCycle: async () => null,
    create: async (data) => ({ id: 99, ...data, cycleName: 'DAW', legislationName: 'LOMLOE' }),
    update: async () => baseModule,
    delete: async () => {},
    hasProjects: async () => false,
    hasRubric: async () => false,
    hasCorrections: async () => false,
    isTeacherAssigned: async () => false,
    ...overrides,
  };
}

// ── Element #23 — Module name validation ─────────────────────────────────────

describe('Element #23 — ModuleService: name validation', () => {
  it('accepts valid name between 3 and 100 characters', async () => {
    const service = new ModuleService(makeRepo());
    const result = await service.create({
      name: 'DEW', weeklyHours: 7, cycleId: 1, legislationId: 1,
    });
    expect(result.name).toBe('DEW');
  });

  it('throws when name is empty', async () => {
    const service = new ModuleService(makeRepo());
    await expect(service.create({ name: '', weeklyHours: 7, cycleId: 1, legislationId: 1 })).rejects.toThrow();
  });
});

// ── Element #24 — Weekly hours validation ─────────────────────────────────────

describe('Element #24 — ModuleService: weeklyHours validation (1–30)', () => {
  it('accepts valid integer within 1–30', async () => {
    const service = new ModuleService(makeRepo());
    const result = await service.create({ name: 'DEW', weeklyHours: 7, cycleId: 1, legislationId: 1 });
    expect(result.weeklyHours).toBe(7);
  });

  it('throws when weeklyHours is 0', async () => {
    const service = new ModuleService(makeRepo());
    await expect(service.create({ name: 'DEW', weeklyHours: 0, cycleId: 1, legislationId: 1 })).rejects.toThrow();
  });

  it('throws when weeklyHours is negative', async () => {
    const service = new ModuleService(makeRepo());
    await expect(service.create({ name: 'DEW', weeklyHours: -1, cycleId: 1, legislationId: 1 })).rejects.toThrow();
  });

  it('throws when weeklyHours exceeds 30', async () => {
    const service = new ModuleService(makeRepo());
    await expect(service.create({ name: 'DEW', weeklyHours: 31, cycleId: 1, legislationId: 1 })).rejects.toThrow();
  });

  it('throws when weeklyHours is not an integer', async () => {
    const service = new ModuleService(makeRepo());
    await expect(service.create({ name: 'DEW', weeklyHours: 7.5, cycleId: 1, legislationId: 1 })).rejects.toThrow();
  });
});

// ── Element #25 — Legislation IS persisted on the module ─────────────────────

describe('Element #25 — ModuleService: legislation_id IS stored in module', () => {
  it('persists legislation_id in the module entity', async () => {
    let savedData: unknown;
    const repo = makeRepo({
      create: async (data) => { savedData = data; return { id: 99, ...data, cycleName: 'DAW', legislationName: 'LOMLOE' }; },
    });
    const service = new ModuleService(repo);
    await service.create({ name: 'DEW', weeklyHours: 7, cycleId: 1, legislationId: 1 });
    expect((savedData as Record<string, unknown>).legislationId).toBe(1);
  });

  it('throws when legislationId is missing', async () => {
    const service = new ModuleService(makeRepo());
    await expect(service.create({ name: 'DEW', weeklyHours: 7, cycleId: 1, legislationId: undefined as unknown as number }))
      .rejects.toThrow();
  });
});

// ── Element #27 — Ciclo selector requires parents ────────────────────────────

describe('Element #27 — ModuleService: cycleId is required', () => {
  it('throws when cycleId is missing', async () => {
    const service = new ModuleService(makeRepo());
    await expect(service.create({ name: 'DEW', weeklyHours: 7, cycleId: undefined as unknown as number, legislationId: 1 }))
      .rejects.toThrow();
  });
});

// ── Element #28 — Guardar: uniqueness constraint ──────────────────────────────

describe('Element #28 — ModuleService: UNIQUE (name, cycle_id, legislation_id)', () => {
  it('throws DUPLICATE when combination already exists', async () => {
    const repo = makeRepo({ findByNameAndCycle: async () => baseModule });
    const service = new ModuleService(repo);
    await expect(service.create({ name: 'DEW', weeklyHours: 7, cycleId: 1, legislationId: 1 }))
      .rejects.toMatchObject({ code: 'DUPLICATE' });
  });
});

// ── Element #33 — Table: edit and delete ─────────────────────────────────────

describe('Element #33 — ModuleService: delete', () => {
  it('deletes module when no dependent projects', async () => {
    let deleted = false;
    const repo = makeRepo({ delete: async () => { deleted = true; } });
    const service = new ModuleService(repo);
    await service.delete(1);
    expect(deleted).toBe(true);
  });

  it('throws CONFLICT when module has associated projects', async () => {
    const repo = makeRepo({ hasProjects: async () => true });
    const service = new ModuleService(repo);
    await expect(service.delete(1)).rejects.toMatchObject({ code: 'HAS_DEPENDANTS' });
  });
});

// ── API integration tests ─────────────────────────────────────────────────────

describe('Element #28 — POST /api/modules', () => {
  it('returns 201 with new module containing all 4 required fields', async () => {
    // name 'DEW Nuevo' (not the fixture's own 'DEW') + legislationId: 2
    // (LOMLOE) — using the fixture's exact ('DEW', cycleId:1, legislationId:2)
    // tuple would 409 as a duplicate of module 1; legislationId: 1 (LOGSE)
    // avoided too since legislation.test.ts's own DELETE test (alphabetically
    // earlier) removes it for real, which would 500 on the FK instead.
    const res = await fetch(`${BASE_URL}/api/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'DEW Nuevo', weeklyHours: 7, cycleId: 1, legislationId: 2 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.name).toBe('DEW Nuevo');
    expect(body.weeklyHours).toBe(7);
    expect(body.cycleId).toBe(1);
    expect(body.legislationId).toBe(2);
  });

  it('returns 400 when weeklyHours is out of range', async () => {
    const res = await fetch(`${BASE_URL}/api/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'DEW', weeklyHours: 0, cycleId: 1, legislationId: 2 }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 when name+cycleId+legislationId combination already exists', async () => {
    // Same-name collision, not with the fixture — creates it twice itself.
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'DEW Duplicado', weeklyHours: 7, cycleId: 1, legislationId: 2 }),
    };
    await fetch(`${BASE_URL}/api/modules`, opts);
    const res = await fetch(`${BASE_URL}/api/modules`, opts);
    expect(res.status).toBe(409);
  });
});

describe('Element #33 — PUT /api/modules/:id', () => {
  it('returns 200 with the updated module', async () => {
    // Creates its own module rather than mutating the shared seed module 1
    // ("DEW") — students.test.ts's CSV upload resolves a module by that name.
    // legislationId: 2 (LOMLOE) — legislation 1 (LOGSE) is deleted for real
    // by legislation.test.ts, which runs alphabetically before this file.
    const created = await fetch(`${BASE_URL}/api/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'Módulo editable', weeklyHours: 5, cycleId: 1, legislationId: 2 }),
    });
    const { id } = await created.json() as { id: number };

    const res = await fetch(`${BASE_URL}/api/modules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'Módulo editado', weeklyHours: 9 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.name).toBe('Módulo editado');
    expect(body.weeklyHours).toBe(9);
  });

  it('returns 404 when the module does not exist', async () => {
    const res = await fetch(`${BASE_URL}/api/modules/99999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'Cualquiera' }),
    });
    expect(res.status).toBe(404);
  });
});

describe('Elements #29–#32 — GET /api/modules', () => {
  it('returns 200 with array of modules including cycleName and legislationName', async () => {
    const res = await fetch(`${BASE_URL}/api/modules`);
    expect(res.status).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBe(true);
    if (body.length > 0) {
      expect(body[0].cycleName).toBeDefined();
      expect(body[0].legislationName).toBeDefined();
    }
  });

  it('filters by name query param', async () => {
    const res = await fetch(`${BASE_URL}/api/modules?name=dew`);
    expect(res.status).toBe(200);
  });

  it('filters by cycleId', async () => {
    const res = await fetch(`${BASE_URL}/api/modules?cycleId=1`);
    expect(res.status).toBe(200);
  });

  it('filters by legislationId', async () => {
    const res = await fetch(`${BASE_URL}/api/modules?legislationId=1`);
    expect(res.status).toBe(200);
  });

  it('filters by year (via legislation.start_year)', async () => {
    const res = await fetch(`${BASE_URL}/api/modules?year=2020`);
    expect(res.status).toBe(200);
  });

  it('filters by teacherId to show only assigned modules', async () => {
    const res = await fetch(`${BASE_URL}/api/modules?teacherId=1`);
    expect(res.status).toBe(200);
  });
});

describe('Element #33 — DELETE /api/modules/:id', () => {
  it('returns 204 when module has no projects', async () => {
    // Module 1 ("DEW") isn't a clean pick here — the shared fixture ties it
    // to a rubric + a correction (blocking dependents in their own right),
    // which would confuse a test specifically about the "no projects" path.
    // Creating a fresh, fully unattached module isolates that path.
    const created = await fetch(`${BASE_URL}/api/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'Módulo sin proyectos', weeklyHours: 5, cycleId: 1, legislationId: 2 }),
    });
    const { id } = await created.json() as { id: number };

    const res = await fetch(`${BASE_URL}/api/modules/${id}`, {
      method: 'DELETE',
      headers: { 'Cookie': 'session_id=admin-session' },
    });
    expect(res.status).toBe(204);
  });

  it('returns 409 when module has associated projects', async () => {
    const created = await fetch(`${BASE_URL}/api/modules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'Módulo con proyecto', weeklyHours: 5, cycleId: 1, legislationId: 2 }),
    });
    const { id: moduleId } = await created.json() as { id: number };
    await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': 'session_id=admin-session' },
      body: JSON.stringify({ name: 'Proyecto bloqueante', academicYear: '2024-2025', moduleId }),
    });

    const res = await fetch(`${BASE_URL}/api/modules/${moduleId}`, {
      method: 'DELETE',
      headers: { 'Cookie': 'session_id=admin-session' },
    });
    expect(res.status).toBe(409);
  });
});
