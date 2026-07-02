// sketchNumbers: 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60
// UC-06: Gestión de Alumnos

import { describe, it, expect } from 'bun:test';
import { StudentService } from '../src/services/student.service';
import { StudentImporter } from '../src/services/student-importer';
import type { StudentRepository } from '../src/repositories/student.repository';
import type { StudentParserService } from '../src/services/file-parser.service';

const BASE_URL = 'http://localhost:3456';

// ── Domain doubles ────────────────────────────────────────────────────────────

const baseStudent = {
  id: 1,
  name: 'JJ499',
  cycleId: 1,
  cycleName: 'DAW',
  modules: [{ id: 1, name: 'DEW' }],
};

function makeRepo(overrides: Partial<StudentRepository> = {}): StudentRepository {
  return {
    findAll: async () => [baseStudent],
    findById: async () => baseStudent,
    create: async (data) => ({ id: 99, ...data, cycleName: 'DAW', modules: [] }),
    update: async () => baseStudent,
    delete: async () => {},
    isAssignedToProject: async () => false,
    ...overrides,
  };
}

function makeParser(overrides: Partial<StudentParserService> = {}): StudentParserService {
  return {
    parseStudents: async () => [
      { name: 'JJ499', cycleId: 1, moduleId: 1 },
      { name: 'MnP454', cycleId: 1, moduleId: 1 },
    ],
    ...overrides,
  };
}

// ── Element #48 — Student name: free text ────────────────────────────────────

describe('Element #48 — StudentService: name is free text (no format enforced)', () => {
  it('accepts an anonymised code like JJ499', async () => {
    const service = new StudentService(makeRepo());
    const result = await service.create({ name: 'JJ499', cycleId: 1, moduleId: 1 });
    expect(result.name).toBe('JJ499');
  });

  it('accepts a real name with spaces', async () => {
    const service = new StudentService(makeRepo());
    const result = await service.create({ name: 'María García', cycleId: 1, moduleId: 1 });
    expect(result.name).toBe('María García');
  });

  it('throws when name is empty', async () => {
    const service = new StudentService(makeRepo());
    await expect(service.create({ name: '', cycleId: 1, moduleId: 1 })).rejects.toThrow();
  });

  it('throws when name is shorter than 2 characters', async () => {
    const service = new StudentService(makeRepo());
    await expect(service.create({ name: 'A', cycleId: 1, moduleId: 1 })).rejects.toThrow();
  });

  it('does NOT reject special characters or numbers in name', async () => {
    const service = new StudentService(makeRepo());
    const result = await service.create({ name: 'AB123-X', cycleId: 1, moduleId: 1 });
    expect(result.name).toBe('AB123-X');
  });
});

// ── Elements #49–#52 — Cascade selector validation ───────────────────────────

describe('Elements #49–#52 — StudentService: cascade fields required', () => {
  it('throws when cycleId is missing', async () => {
    const service = new StudentService(makeRepo());
    await expect(service.create({ name: 'JJ499', cycleId: undefined as unknown as number, moduleId: 1 }))
      .rejects.toThrow();
  });

  it('throws when moduleId is missing', async () => {
    const service = new StudentService(makeRepo());
    await expect(service.create({ name: 'JJ499', cycleId: 1, moduleId: undefined as unknown as number }))
      .rejects.toThrow();
  });
});

// ── Element #53 — Nuevo: save student ────────────────────────────────────────

describe('Element #53 — StudentService: create', () => {
  it('persists student in student table and creates student_module link', async () => {
    let createdData: unknown;
    const repo = makeRepo({ create: async (data) => { createdData = data; return { id: 1, ...data as object, cycleName: 'DAW', modules: [] }; } });
    const service = new StudentService(repo);
    await service.create({ name: 'JJ499', cycleId: 1, moduleId: 1 });
    expect((createdData as Record<string, unknown>).name).toBe('JJ499');
    expect((createdData as Record<string, unknown>).moduleId).toBe(1);
  });
});

// ── Element #54 — Bulk import ─────────────────────────────────────────────────

describe('Element #54 — StudentImporter: file upload', () => {
  it('creates all students from a valid CSV/JSON/YAML file', async () => {
    let createdCount = 0;
    const repo = makeRepo({ create: async () => { createdCount++; return baseStudent; } });
    const importer = new StudentImporter(repo, makeParser());
    const result = await importer.importFromFile(Buffer.from('fake-csv'), 'students.csv');
    expect(result.created).toBe(2);
    expect(createdCount).toBe(2);
  });

  it('throws and saves NO students when any row has missing required field', async () => {
    let createdCount = 0;
    const repo = makeRepo({ create: async () => { createdCount++; return baseStudent; } });
    const parser = makeParser({
      parseStudents: async () => { throw new Error('MISSING_FIELD: nombre'); },
    });
    const importer = new StudentImporter(repo, parser);
    await expect(importer.importFromFile(Buffer.from('bad-csv'), 'students.csv')).rejects.toThrow();
    expect(createdCount).toBe(0); // atomic — no partial saves
  });

  it('throws when file format is not CSV, JSON, or YAML', async () => {
    const importer = new StudentImporter(makeRepo(), makeParser());
    await expect(importer.importFromFile(Buffer.from(''), 'students.xlsx')).rejects.toMatchObject({
      code: 'UNSUPPORTED_FORMAT',
    });
  });
});

// ── Element #60 — Table: delete blocked if in project ────────────────────────

describe('Element #60 — StudentService: delete', () => {
  it('deletes student when not assigned to any project', async () => {
    let deleted = false;
    const repo = makeRepo({ delete: async () => { deleted = true; } });
    const service = new StudentService(repo);
    await service.delete(1);
    expect(deleted).toBe(true);
  });

  it('throws CONFLICT when student is assigned to a project', async () => {
    const repo = makeRepo({ isAssignedToProject: async () => true });
    const service = new StudentService(repo);
    await expect(service.delete(1)).rejects.toMatchObject({ code: 'HAS_DEPENDANTS' });
  });
});

// ── API integration tests ─────────────────────────────────────────────────────

describe('Element #53 — POST /api/students', () => {
  it('returns 201 with new student accepting free-text name', async () => {
    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'JJ499', cycleId: 1, moduleId: 1 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { name: string };
    expect(body.name).toBe('JJ499');
  });

  it('returns 400 when name is empty', async () => {
    const res = await fetch(`${BASE_URL}/api/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', cycleId: 1, moduleId: 1 }),
    });
    expect(res.status).toBe(400);
  });
});

describe('Element #54 — POST /api/students/upload', () => {
  it('returns 201 with created count for valid CSV file', async () => {
    const csv = 'nombre,año_inicio,legislacion,ciclo,modulo\nJJ499,2024,LOMLOE,DAW,DEW\n';
    const formData = new FormData();
    formData.append('file', new Blob([csv], { type: 'text/csv' }), 'students.csv');
    const res = await fetch(`${BASE_URL}/api/students/upload`, {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { created: number; errors: unknown[] };
    expect(body.created).toBeGreaterThan(0);
    expect(body.errors).toHaveLength(0);
  });

  it('returns 400 for unsupported file format (.xlsx)', async () => {
    const formData = new FormData();
    formData.append('file', new Blob(['data'], { type: 'application/vnd.ms-excel' }), 'students.xlsx');
    const res = await fetch(`${BASE_URL}/api/students/upload`, {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(400);
  });

  it('returns 422 with errors array and saves NO data when a row has missing field', async () => {
    const csv = 'nombre,año_inicio,legislacion,ciclo\nJJ499,2024,LOMLOE,DAW\n'; // missing modulo
    const formData = new FormData();
    formData.append('file', new Blob([csv], { type: 'text/csv' }), 'students.csv');
    const res = await fetch(`${BASE_URL}/api/students/upload`, {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(422);
    const body = await res.json() as { errors: unknown[] };
    expect(body.errors.length).toBeGreaterThan(0);
  });
});

describe('Elements #55–#59 — GET /api/students', () => {
  it('returns 200 with array of students', async () => {
    const res = await fetch(`${BASE_URL}/api/students`);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });

  it('filters by name substring', async () => {
    const res = await fetch(`${BASE_URL}/api/students?name=JJ`);
    expect(res.status).toBe(200);
  });

  it('filters by cycleId', async () => {
    const res = await fetch(`${BASE_URL}/api/students?cycleId=1`);
    expect(res.status).toBe(200);
  });

  it('filters by moduleId', async () => {
    const res = await fetch(`${BASE_URL}/api/students?moduleId=1`);
    expect(res.status).toBe(200);
  });
});

describe('Element #60 — DELETE /api/students/:id', () => {
  it('returns 204 when student has no project assignment', async () => {
    const res = await fetch(`${BASE_URL}/api/students/1`, { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  it('returns 409 when student is assigned to a project', async () => {
    const res = await fetch(`${BASE_URL}/api/students/1`, { method: 'DELETE' });
    expect(res.status).toBe(409);
  });
});
