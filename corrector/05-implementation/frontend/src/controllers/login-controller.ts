import type { AuthService, TeacherRole } from '../services/auth.service';

export type LoginState =
  | { status: 'redirect'; to: string }
  | { status: 'error'; message: string }
  | { status: 'password-change-required'; role: TeacherRole };

export type ChangePasswordState =
  | { status: 'redirect'; to: string }
  | { status: 'error'; message: string };

const LANDING_PAGE: Record<TeacherRole, string> = {
  admin: '/admin',
  profesor: '/profesor',
  tutor: '/profesor',
};

export class LoginController {
  constructor(private readonly authService: AuthService) {}

  async login(username: string, password: string): Promise<LoginState> {
    const result = await this.authService.login(username, password);

    if (result.ok) {
      if (result.mustChangePassword) {
        return { status: 'password-change-required', role: result.role };
      }
      return { status: 'redirect', to: LANDING_PAGE[result.role] };
    }

    if (result.code === 'ACCOUNT_LOCKED') {
      const message = result.role === 'admin'
        ? 'Póngase en contacto con el soporte técnico'
        : 'Póngase en contacto con el Administrador';
      return { status: 'error', message };
    }

    return { status: 'error', message: 'Credenciales incorrectas' };
  }

  async changePassword(
    newPassword: string,
    confirmPassword: string,
    role: TeacherRole,
  ): Promise<ChangePasswordState> {
    if (newPassword !== confirmPassword) {
      return { status: 'error', message: 'Las contraseñas no coinciden' };
    }

    const result = await this.authService.changePassword(newPassword, confirmPassword);
    if (!result.ok) {
      return { status: 'error', message: 'No se pudo actualizar la contraseña' };
    }

    return { status: 'redirect', to: LANDING_PAGE[role] };
  }
}
