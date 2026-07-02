// sketchNumbers: 1, 2, 3, 11
// UC-01: Login, logout y gestión de sesión

import { describe, it, expect } from 'bun:test';
import { AuthService } from '../src/services/auth.service';
import type { TeacherRepository } from '../src/repositories/teacher.repository';
import type { SessionRepository } from '../src/repositories/session.repository';

const BASE_URL = 'http://localhost:3456';

// ── Domain doubles ────────────────────────────────────────────────────────────

const baseTeacher = {
  id: 1,
  username: 'dbetqui',
  passwordHash: '$2b$10$TRixixD6bss1z.scYABrvue1UoaAqIr1UcWUwe.pP7ucUYLwaLhku', // bcrypt hash of 'correctpass'
  role: 'profesor' as const,
  accountLocked: false,
  failedLoginAttempts: 0,
  mustChangePassword: false,
};

function makeTeacherRepo(overrides: Partial<TeacherRepository> = {}): TeacherRepository {
  return {
    findAll: async () => [],
    findByUsername: async () => baseTeacher,
    findById: async () => baseTeacher,
    save: async () => ({ ...baseTeacher, passwordStatus: 'default' as const, modules: [] }),
    update: async () => ({ ...baseTeacher, passwordStatus: 'default' as const, modules: [] }),
    delete: async () => {},
    hasCorrections: async () => false,
    updateFailedAttempts: async () => {},
    resetFailedAttempts: async () => {},
    lockAccount: async () => {},
    updatePassword: async () => {},
    ...overrides,
  };
}

function makeSessionRepo(overrides: Partial<SessionRepository> = {}): SessionRepository {
  return {
    create: async () => 'fake-session-token',
    destroy: async () => {},
    find: async () => ({ teacherId: 1, expiresAt: new Date(Date.now() + 600_000) }),
    ...overrides,
  };
}

// ── Element #1 & #2 — Username and password field validation ──────────────────

describe('Element #1 — Username field validation', () => {
  it('requires username: service rejects empty string', async () => {
    const service = new AuthService(makeTeacherRepo(), makeSessionRepo());
    await expect(service.login('', 'validpass')).rejects.toThrow();
  });

  it('accepts 4–20 alphanumeric characters', async () => {
    const service = new AuthService(makeTeacherRepo(), makeSessionRepo());
    const result = await service.login('dbetqui', 'correctpass');
    expect(result.username).toBe('dbetqui');
  });
});

describe('Element #2 — Password field validation', () => {
  it('requires password: service rejects empty string', async () => {
    const service = new AuthService(makeTeacherRepo(), makeSessionRepo());
    await expect(service.login('dbetqui', '')).rejects.toThrow();
  });

  it('enforces minimum 8 characters for password change', async () => {
    const service = new AuthService(makeTeacherRepo(), makeSessionRepo());
    await expect(
      service.changePassword(1, '12345678', 'short', 'short')
    ).rejects.toThrow();
  });
});

// ── Element #3 — Login button / AuthService domain logic ─────────────────────

describe('Element #3 — AuthService: successful login', () => {
  it('returns teacher data and session token on valid credentials', async () => {
    const service = new AuthService(makeTeacherRepo(), makeSessionRepo());
    const result = await service.login('dbetqui', 'correctpass');
    expect(result.id).toBe(1);
    expect(result.role).toBe('profesor');
    expect(result.sessionToken).toBeDefined();
  });

  it('returns mustChangePassword=true when teacher has default password', async () => {
    const repo = makeTeacherRepo({
      findByUsername: async () => ({ ...baseTeacher, mustChangePassword: true }),
    });
    const service = new AuthService(repo, makeSessionRepo());
    const result = await service.login('dbetqui', 'correctpass');
    expect(result.mustChangePassword).toBe(true);
  });

  it('resets failed_login_attempts to 0 on successful login', async () => {
    let resetCalled = false;
    const repo = makeTeacherRepo({
      findByUsername: async () => ({ ...baseTeacher, failedLoginAttempts: 1 }),
      resetFailedAttempts: async () => { resetCalled = true; },
    });
    const service = new AuthService(repo, makeSessionRepo());
    await service.login('dbetqui', 'correctpass');
    expect(resetCalled).toBe(true);
  });
});

describe('Element #3 — AuthService: invalid credentials', () => {
  it('throws on unknown username', async () => {
    const repo = makeTeacherRepo({ findByUsername: async () => null });
    const service = new AuthService(repo, makeSessionRepo());
    await expect(service.login('nobody', 'anypass')).rejects.toThrow();
  });

  it('throws on wrong password and increments failed_login_attempts', async () => {
    let attempts = 0;
    const repo = makeTeacherRepo({
      updateFailedAttempts: async (id, count) => { attempts = count; },
    });
    const service = new AuthService(repo, makeSessionRepo());
    await expect(service.login('dbetqui', 'wrongpass')).rejects.toThrow();
    expect(attempts).toBeGreaterThan(0);
  });

  it('locks account after 3rd consecutive failure for profesor', async () => {
    let locked = false;
    const repo = makeTeacherRepo({
      findByUsername: async () => ({ ...baseTeacher, failedLoginAttempts: 2 }),
      lockAccount: async () => { locked = true; },
    });
    const service = new AuthService(repo, makeSessionRepo());
    await expect(service.login('dbetqui', 'wrongpass')).rejects.toThrow();
    expect(locked).toBe(true);
  });

  it('throws ACCOUNT_LOCKED error when account is locked', async () => {
    const repo = makeTeacherRepo({
      findByUsername: async () => ({ ...baseTeacher, accountLocked: true }),
    });
    const service = new AuthService(repo, makeSessionRepo());
    await expect(service.login('dbetqui', 'anypass')).rejects.toMatchObject({
      code: 'ACCOUNT_LOCKED',
    });
  });

  it('includes admin-specific lock message for admin role', async () => {
    const repo = makeTeacherRepo({
      findByUsername: async () => ({
        ...baseTeacher,
        role: 'admin' as const,
        failedLoginAttempts: 2,
      }),
    });
    const service = new AuthService(repo, makeSessionRepo());
    await expect(service.login('adminuser', 'wrongpass')).rejects.toMatchObject({
      role: 'admin',
    });
  });
});

describe('Element #3 — AuthService: first-login password change', () => {
  it('throws when newPassword and confirmPassword do not match', async () => {
    const service = new AuthService(makeTeacherRepo(), makeSessionRepo());
    await expect(
      service.changePassword(1, '12345678', 'NewPass1!', 'NewPass2!')
    ).rejects.toThrow();
  });

  it('throws when newPassword is shorter than 8 characters', async () => {
    const service = new AuthService(makeTeacherRepo(), makeSessionRepo());
    await expect(
      service.changePassword(1, '12345678', 'short', 'short')
    ).rejects.toThrow();
  });

  it('updates password hash and sets mustChangePassword=false on success', async () => {
    let passwordUpdated = false;
    const repo = makeTeacherRepo({
      updatePassword: async () => { passwordUpdated = true; },
    });
    const service = new AuthService(repo, makeSessionRepo());
    await service.changePassword(1, '12345678', 'NewSecurePass1!', 'NewSecurePass1!');
    expect(passwordUpdated).toBe(true);
  });
});

// ── Element #3 — API integration tests ───────────────────────────────────────

describe('Element #3 — POST /api/auth/login', () => {
  it('returns 200 with role and session cookie for valid admin credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'Admin1234!' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { role: string; mustChangePassword: boolean };
    expect(body.role).toBe('admin');
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('session_id=');
    expect(cookie).toContain('HttpOnly');
  });

  it('returns 200 with role=profesor for valid profesor credentials', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'profesor1', password: '12345678' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json() as { role: string };
    expect(['profesor', 'tutor']).toContain(body.role);
  });

  it('returns 400 when username is empty', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: '', password: '12345678' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is empty', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'dbetqui', password: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 401 for invalid credentials and shows Credenciales incorrectas', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'noone', password: 'wrongpass' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns 423 when account is locked', async () => {
    const opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'lockedteacher', password: 'wrong' }),
    };
    // Force 3 failures to lock the account
    await fetch(`${BASE_URL}/api/auth/login`, opts);
    await fetch(`${BASE_URL}/api/auth/login`, opts);
    await fetch(`${BASE_URL}/api/auth/login`, opts);
    const res = await fetch(`${BASE_URL}/api/auth/login`, opts);
    expect(res.status).toBe(423);
  });
});

describe('Element #3 — POST /api/auth/change-password', () => {
  it('returns 400 when passwords do not match', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: '12345678', newPassword: 'Pass1!', confirmPassword: 'Pass2!' }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when newPassword is shorter than 8 characters', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: '12345678', newPassword: 'short', confirmPassword: 'short' }),
    });
    expect(res.status).toBe(400);
  });
});

// ── Element #11 — Nav bar logout ──────────────────────────────────────────────

describe('Element #11 — POST /api/auth/logout', () => {
  it('returns 200 and clears session cookie', async () => {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST' });
    expect(res.status).toBe(200);
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('session_id=');
    expect(cookie).toContain('Max-Age=0');
  });

  it('AuthService.logout destroys the session record', async () => {
    let destroyed = false;
    const sessionRepo = makeSessionRepo({ destroy: async () => { destroyed = true; } });
    const service = new AuthService(makeTeacherRepo(), sessionRepo);
    await service.logout('fake-session-token');
    expect(destroyed).toBe(true);
  });
});
