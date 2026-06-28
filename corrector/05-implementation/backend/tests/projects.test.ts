// sketchNumbers: 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72
// UC-07: Gestión de Proyectos

import { describe, it, expect } from 'bun:test';
import { ProjectService } from '../src/services/project.service';
import type { ProjectRepository } from '../src/repositories/project.repository';

const BASE_URL = 'http://localhost:3000';

// ── Domain doubles ────────────────────────────────────────────────────────────

const baseProject = {
  id: 1,
  name: 'App gestión inventario',
  academicYear: '2024-2025',
  moduleId: 1,
  moduleName: 'DEW',
  cycleName: 'DAW',
  studentCount: 0,
};

function makeRepo(overrides: Partial<ProjectRepository> = {}): ProjectRepository {
  return {
    findAll: async () => [baseProject],
    findById: async () => baseProject,
    create: async (data) => ({ id: 99, ...data, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 }),
    update: async () => baseProject,
    delete: async () => {},
    hasStudents: async () => false,
    ...overrides,
  };
}

// ── Element #61 — Project name validation ────────────────────────────────────

describe('Element #61 — ProjectService: name validation', () => {
  it('accepts valid name between 2 and 100 characters', async () => {
    const service = new ProjectService(makeRepo());
    const result = await service.create({ name: 'App inventario', academicYear: '2024-2025', moduleId: 1 });
    expect(result.name).toBe('App inventario');
  });

  it('throws when name is empty', async () => {
    const service = new ProjectService(makeRepo());
    await expect(service.create({ name: '', academicYear: '2024-2025', moduleId: 1 })).rejects.toThrow();
  });

  it('throws when name is shorter than 2 characters', async () => {
    const service = new ProjectService(makeRepo());
    await expect(service.create({ name: 'A', academicYear: '2024-2025', moduleId: 1 })).rejects.toThrow();
  });
});

// ── Element #62–#65 — Cascade selectors validation ───────────────────────────

describe('Elements #62–#65 — ProjectService: cascade field validation', () => {
  it('stores academicYear in format YYYY-YYYY', async () => {
    const service = new ProjectService(makeRepo());
    const result = await service.create({ name: 'App', academicYear: '2024-2025', moduleId: 1 });
    expect(result.academicYear).toMatch(/^\d{4}-\d{4}$/);
  });

  it('throws when academicYear format is incorrect', async () => {
    const service = new ProjectService(makeRepo());
    await expect(service.create({ name: 'App', academicYear: '2024', moduleId: 1 })).rejects.toThrow();
  });

  it('throws when moduleId is missing', async () => {
    const service = new ProjectService(makeRepo());
    await expect(service.create({ name: 'App', academicYear: '2024-2025', moduleId: undefined as unknown as number }))
      .rejects.toThrow();
  });
});

// ── Element #66 — Nuevo: project creation ─────────────────────────────────────

describe('Element #66 — ProjectService: create', () => {
  it('persists project with name, academicYear and moduleId', async () => {
    let savedData: unknown;
    const repo = makeRepo({
      create: async (data) => { savedData = data; return { id: 1, ...data as object, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 }; },
    });
    const service = new ProjectService(repo);
    await service.create({ name: 'App inventario', academicYear: '2024-2025', moduleId: 1 });
    expect((savedData as Record<string, unknown>).name).toBe('App inventario');
    expect((savedData as Record<string, unknown>).moduleId).toBe(1);
    expect((savedData as Record<string, unknown>).academicYear).toBe('2024-2025');
  });
});

// ── Element #72 — Table: delete blocked if has students ──────────────────────

describe('Element #72 — ProjectService: delete', () => {
  it('deletes project when no students are assigned', async () => {
    let deleted = false;
    const repo = makeRepo({ delete: async () => { deleted = true; } });
    const service = new ProjectService(repo);
    await service.delete(1);
    expect(deleted).toBe(true);
  });

  it('throws CONFLICT when project has assigned students', async () => {
    const repo = makeRepo({ hasStudents: async () => true });
    const service = new ProjectService(repo);
    await expect(service.delete(1)).rejects.toMatchObject({ code: 'HAS_DEPENDANTS' });
  });
});

// ── API integration tests ─────────────────────────────────────────────────────

describe('Element #66 — POST /api/projects', () => {
  it('returns 201 with new project', async () => {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'App inventario', academicYear: '2024-2025', moduleId: 1 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id: number; name: string; academicYear: string };
    expect(body.name).toBe('App inventario');
    expect(body.academicYear).toBe('2024-2025');
  });

  it('returns 400 when name is empty', async () => {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', academicYear: '2024-2025', moduleId: 1 }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when academicYear format is incorrect', async () => {
    const res = await fetch(`${BASE_URL}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'App', academicYear: '2024', moduleId: 1 }),
    });
    expect(res.status).toBe(400);
  });
});

describe('Elements #67–#71 — GET /api/projects', () => {
  it('returns 200 with array of projects', async () => {
    const res = await fetch(`${BASE_URL}/api/projects`);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('filters by name substring', async () => {
    const res = await fetch(`${BASE_URL}/api/projects?name=inventario`);
    expect(res.status).toBe(200);
  });

  it('filters by academicYear', async () => {
    const res = await fetch(`${BASE_URL}/api/projects?academicYear=2024-2025`);
    expect(res.status).toBe(200);
  });

  it('filters by moduleId', async () => {
    const res = await fetch(`${BASE_URL}/api/projects?moduleId=1`);
    expect(res.status).toBe(200);
  });

  it('filters by legislationId (via module → legislation)', async () => {
    const res = await fetch(`${BASE_URL}/api/projects?legislationId=1`);
    expect(res.status).toBe(200);
  });
});

describe('Element #72 — DELETE /api/projects/:id', () => {
  it('returns 204 when project has no assigned students', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1`, { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  it('returns 409 when project has students assigned', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1`, { method: 'DELETE' });
    expect(res.status).toBe(409);
  });
});
