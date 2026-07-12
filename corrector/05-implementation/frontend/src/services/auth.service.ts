export type TeacherRole = 'admin' | 'profesor' | 'tutor';

export interface LoginSuccess {
  ok: true;
  role: TeacherRole;
  mustChangePassword: boolean;
}

export interface LoginFailure {
  ok: false;
  status: number;
  code: string;
  role?: TeacherRole;
}

export type LoginApiResult = LoginSuccess | LoginFailure;

export interface ChangePasswordApiResult {
  ok: boolean;
}

export interface LogoutApiResult {
  ok: boolean;
}

export interface MeSuccess {
  ok: true;
  id: number;
  role: TeacherRole;
}

export interface MeFailure {
  ok: false;
  status: number;
}

export type MeResult = MeSuccess | MeFailure;

export interface AuthService {
  login(username: string, password: string): Promise<LoginApiResult>;
  changePassword(newPassword: string, confirmPassword: string): Promise<ChangePasswordApiResult>;
  logout(): Promise<LogoutApiResult>;
  me(): Promise<MeResult>;
}

export class HttpAuthService implements AuthService {
  async login(username: string, password: string): Promise<LoginApiResult> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    if (res.ok) {
      const body = await res.json() as { role: TeacherRole; mustChangePassword: boolean };
      return { ok: true, role: body.role, mustChangePassword: body.mustChangePassword };
    }

    const body = await res.json() as { code?: string; role?: TeacherRole };
    return { ok: false, status: res.status, code: body.code ?? '', role: body.role };
  }

  async changePassword(newPassword: string, confirmPassword: string): Promise<ChangePasswordApiResult> {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword, confirmPassword }),
    });
    return { ok: res.ok };
  }

  async logout(): Promise<LogoutApiResult> {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    return { ok: res.ok };
  }

  async me(): Promise<MeResult> {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return { ok: false, status: res.status };
    const body = await res.json() as { id: number; role: TeacherRole };
    return { ok: true, id: body.id, role: body.role };
  }
}
