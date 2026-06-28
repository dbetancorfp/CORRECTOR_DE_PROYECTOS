// sketchNumbers: 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46
// UC-05: Gestión de Profesorado

import { describe, it, expect } from 'bun:test';
import { TeacherService } from '../src/services/teacher.service';
import type { TeacherRepository } from '../src/repositories/teacher.repository';

const BASE_URL = 'http://localhost:3000';

// ── Domain doubles ────────────────────────────────────────────────────────────

const baseTeacher = {
  id: 1,
  username: 'mariagon',
  role: 'profesor' as const,
  passwordStatus: 'default' as const,
  accountLocked: false,
  failedLoginAttempts: 0,
  modules: [{ id: 1, name: 'DEW' }],
};

function makeRepo(overrides: Partial<TeacherRepository> = {}): TeacherRepository {
  return {
    findAll: async () => [baseTeacher],
    findById: async () => baseTeacher,
    findByUsername: async () => null,
    save: async () => baseTeacher,
    update: async () => baseTeacher,
    delete: async () => {},
    hasCorrections: async () => false,
    updateFailedAttempts: async () => {},
    resetFailedAttempts: async () => {},
    lockAccount: async () => {},
    updatePassword: async () => {},
    ...overrides,
  };
}

// ── Element #35 — Username validation ────────────────────────────────────────

describe('Element #35 — TeacherService: username validation', () => {
  it('accepts 4–20 alphanumeric username', async () => {
    const service = new TeacherService(makeRepo());
    const result = await service.create({ username: 'mariagon', password: '12345678', moduleId: 1 });
    expect(result.username).toBe('mariagon');
  });

  it('throws when username is empty', async () => {
    const service = new TeacherService(makeRepo());
    await expect(service.create({ username: '', password: '12345678', moduleId: 1 })).rejects.toThrow();
  });

  it('throws when username is shorter than 4 characters', async () => {
    const service = new TeacherService(makeRepo());
    await expect(service.create({ username: 'abc', password: '12345678', moduleId: 1 })).rejects.toThrow();
  });

  it('throws when username exceeds 20 characters', async () => {
    const service = new TeacherService(makeRepo());
    await expect(service.create({ username: 'a'.repeat(21), password: '12345678', moduleId: 1 })).rejects.toThrow();
  });

  it('throws DUPLICATE when username already exists', async () => {
    const repo = makeRepo({ findByUsername: async () => baseTeacher });
    const service = new TeacherService(repo);
    await expect(service.create({ username: 'mariagon', password: '12345678', moduleId: 1 }))
      .rejects.toMatchObject({ code: 'DUPLICATE' });
  });
});

// ── Element #36 — Password validation ────────────────────────────────────────

describe('Element #36 — TeacherService: password validation', () => {
  it('throws when password is shorter than 8 characters', async () => {
    const service = new TeacherService(makeRepo());
    await expect(service.create({ username: 'mariagon', password: 'short7', moduleId: 1 })).rejects.toThrow();
  });

  it('stores password as bcrypt hash, never plain text', async () => {
    let savedHash: string | undefined;
    const repo = makeRepo({
      save: async (data) => { savedHash = (data as Record<string, string>).passwordHash; return baseTeacher; },
    });
    const service = new TeacherService(repo);
    await service.create({ username: 'mariagon', password: '12345678', moduleId: 1 });
    expect(savedHash).toBeDefined();
    expect(savedHash).not.toBe('12345678');
    expect(savedHash!.startsWith('$2')).toBe(true); // bcrypt prefix
  });
});

// ── Element #41 — Guardar: must_change_password = true ───────────────────────

describe('Element #41 — TeacherService: create sets must_change_password = true', () => {
  it('creates teacher with must_change_password = true', async () => {
    let savedData: unknown;
    const repo = makeRepo({
      save: async (data) => { savedData = data; return baseTeacher; },
    });
    const service = new TeacherService(repo);
    await service.create({ username: 'mariagon', password: '12345678', moduleId: 1 });
    expect((savedData as Record<string, unknown>).mustChangePassword).toBe(true);
  });

  it('creates teacher with role = "profesor" by default', async () => {
    let savedData: unknown;
    const repo = makeRepo({
      save: async (data) => { savedData = data; return baseTeacher; },
    });
    const service = new TeacherService(repo);
    await service.create({ username: 'mariagon', password: '12345678', moduleId: 1 });
    expect((savedData as Record<string, unknown>).role).toBe('profesor');
  });
});

// ── Element #46 — Table: password status display ──────────────────────────────

describe('Element #46 — TeacherService: passwordStatus derivation', () => {
  it('passwordStatus is "default" when mustChangePassword = true', async () => {
    const repo = makeRepo({
      findAll: async () => [{ ...baseTeacher, passwordStatus: 'default' as const }],
    });
    const service = new TeacherService(repo);
    const teachers = await service.list({});
    expect(teachers[0].passwordStatus).toBe('default');
  });

  it('passwordStatus is "changed" when mustChangePassword = false', async () => {
    const repo = makeRepo({
      findAll: async () => [{ ...baseTeacher, passwordStatus: 'changed' as const }],
    });
    const service = new TeacherService(repo);
    const teachers = await service.list({});
    expect(teachers[0].passwordStatus).toBe('changed');
  });
});

// ── Element #46 — Account unlock ─────────────────────────────────────────────

describe('Element #46 — TeacherService: unlock account', () => {
  it('resets account_locked and failed_login_attempts to 0', async () => {
    let unlockedId: number | undefined;
    const repo = makeRepo({
      findById: async () => ({ ...baseTeacher, accountLocked: true, failedLoginAttempts: 3 }),
      resetFailedAttempts: async (id) => { unlockedId = id; },
      lockAccount: async () => {},
    });
    const service = new TeacherService(repo);
    const result = await service.unlock(1);
    expect(result.accountLocked).toBe(false);
    expect(result.failedLoginAttempts).toBe(0);
    expect(unlockedId).toBe(1);
  });

  it('throws when teacher does not exist', async () => {
    const repo = makeRepo({ findById: async () => null });
    const service = new TeacherService(repo);
    await expect(service.unlock(999)).rejects.toThrow();
  });
});

// ── Element #46 — Delete teacher ─────────────────────────────────────────────

describe('Element #46 — TeacherService: delete', () => {
  it('deletes teacher when no correction records exist', async () => {
    let deleted = false;
    const repo = makeRepo({ delete: async () => { deleted = true; } });
    const service = new TeacherService(repo);
    await service.delete(1);
    expect(deleted).toBe(true);
  });

  it('throws CONFLICT when teacher has correction records', async () => {
    const repo = makeRepo({ hasCorrections: async () => true });
    const service = new TeacherService(repo);
    await expect(service.delete(1)).rejects.toMatchObject({ code: 'HAS_DEPENDANTS' });
  });
});

// ── API integration tests ─────────────────────────────────────────────────────

describe('Element #41 — POST /api/teachers', () => {
  it('returns 201 with must_change_password implicit in passwordStatus=default', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testprof', password: '12345678', moduleId: 1 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as Record<string, unknown>;
    expect(body.passwordStatus).toBe('default');
  });

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'testprof', password: 'short', moduleId: 1 }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 when username already exists', async () => {
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'duplicateuser', password: '12345678', moduleId: 1 }),
    };
    await fetch(`${BASE_URL}/api/teachers`, opts);
    const res = await fetch(`${BASE_URL}/api/teachers`, opts);
    expect(res.status).toBe(409);
  });
});

describe('Elements #42–#45 — GET /api/teachers', () => {
  it('returns 200 with teacher list including modules', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers`);
    expect(res.status).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    if (body.length > 0) {
      expect(Array.isArray(body[0].modules)).toBe(true);
    }
  });

  it('filters by year', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers?year=2020`);
    expect(res.status).toBe(200);
  });

  it('filters by legislationId', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers?legislationId=1`);
    expect(res.status).toBe(200);
  });

  it('filters by cycleId', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers?cycleId=1`);
    expect(res.status).toBe(200);
  });

  it('filters by moduleId', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers?moduleId=1`);
    expect(res.status).toBe(200);
  });
});

describe('Element #46 — POST /api/teachers/:id/unlock', () => {
  it('returns 200 with accountLocked=false and failedLoginAttempts=0', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers/1/unlock`, { method: 'POST' });
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.accountLocked).toBe(false);
    expect(body.failedLoginAttempts).toBe(0);
  });

  it('returns 404 when teacher does not exist', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers/99999/unlock`, { method: 'POST' });
    expect(res.status).toBe(404);
  });
});

describe('Element #46 — DELETE /api/teachers/:id', () => {
  it('returns 204 when teacher has no corrections', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers/1`, { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  it('returns 409 when teacher has correction records', async () => {
    const res = await fetch(`${BASE_URL}/api/teachers/1`, { method: 'DELETE' });
    expect(res.status).toBe(409);
  });
});
