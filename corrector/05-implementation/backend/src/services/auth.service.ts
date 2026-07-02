import type { TeacherRepository } from '../repositories/teacher.repository';
import type { SessionRepository } from '../repositories/session.repository';

export interface LoginResult {
  id: number;
  username: string;
  role: 'admin' | 'profesor' | 'tutor';
  mustChangePassword: boolean;
  sessionToken: string;
}

class AppError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly role?: string,
  ) {
    super(message);
  }
}

export class AuthService {
  constructor(
    private readonly teacherRepo: TeacherRepository,
    private readonly sessionRepo: SessionRepository,
  ) {}

  async login(username: string, password: string): Promise<LoginResult> {
    if (!username || username.length < 1) {
      throw new AppError('Username is required', 'VALIDATION_ERROR');
    }
    if (!password || password.length < 1) {
      throw new AppError('Password is required', 'VALIDATION_ERROR');
    }

    const teacher = await this.teacherRepo.findByUsername(username);
    if (!teacher) {
      throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS');
    }

    if (teacher.accountLocked) {
      throw new AppError('Account is locked', 'ACCOUNT_LOCKED');
    }

    let passwordValid = false;
    try {
      passwordValid = await Bun.password.verify(password, teacher.passwordHash);
    } catch {
      passwordValid = false;
    }

    if (!passwordValid) {
      const newCount = teacher.failedLoginAttempts + 1;
      await this.teacherRepo.updateFailedAttempts(teacher.id, newCount);

      if (newCount >= 3) {
        await this.teacherRepo.lockAccount(teacher.id);
      }

      throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', teacher.role);
    }

    await this.teacherRepo.resetFailedAttempts(teacher.id);
    const sessionToken = await this.sessionRepo.create(teacher.id);

    return {
      id: teacher.id,
      username: teacher.username,
      role: teacher.role,
      mustChangePassword: teacher.mustChangePassword,
      sessionToken,
    };
  }

  async logout(sessionToken: string): Promise<void> {
    await this.sessionRepo.destroy(sessionToken);
  }

  async changePassword(
    teacherId: number,
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    if (newPassword !== confirmPassword) {
      throw new AppError('Passwords do not match', 'VALIDATION_ERROR');
    }
    if (newPassword.length < 8) {
      throw new AppError('Password must be at least 8 characters', 'VALIDATION_ERROR');
    }

    const teacher = await this.teacherRepo.findById(teacherId);
    if (!teacher) {
      throw new AppError('Teacher not found', 'NOT_FOUND');
    }

    const newHash = await Bun.password.hash(newPassword, { algorithm: 'bcrypt', cost: 10 });
    await this.teacherRepo.updatePassword(teacher.id, newHash);
  }
}
