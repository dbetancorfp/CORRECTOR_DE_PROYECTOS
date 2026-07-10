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

export interface AuthService {
  login(username: string, password: string): Promise<LoginApiResult>;
  changePassword(newPassword: string, confirmPassword: string): Promise<ChangePasswordApiResult>;
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
}
