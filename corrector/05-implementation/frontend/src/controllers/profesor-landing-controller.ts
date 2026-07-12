import type { AuthService, TeacherRole } from '../services/auth.service';

export class ProfesorLandingController {
  constructor(private readonly authService: AuthService) {}

  async loadRole(): Promise<TeacherRole | null> {
    const result = await this.authService.me();
    return result.ok ? result.role : null;
  }
}
