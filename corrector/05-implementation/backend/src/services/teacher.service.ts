import type { TeacherRepository, TeacherListItem, CreateTeacherData, TeacherFilters } from '../repositories/teacher.repository';

class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

export class TeacherService {
  constructor(private readonly repo: TeacherRepository) {}

  async list(filters: TeacherFilters): Promise<TeacherListItem[]> {
    return this.repo.findAll(filters);
  }

  async create(input: { username: string; password: string; moduleId: number }): Promise<TeacherListItem> {
    if (!input.username || input.username.length < 4) {
      throw new AppError('Username must be at least 4 characters', 'VALIDATION_ERROR');
    }
    if (input.username.length > 20) {
      throw new AppError('Username must be at most 20 characters', 'VALIDATION_ERROR');
    }
    if (!input.password || input.password.length < 8) {
      throw new AppError('Password must be at least 8 characters', 'VALIDATION_ERROR');
    }

    const existing = await this.repo.findByUsername(input.username);
    if (existing) {
      throw new AppError(`Username '${input.username}' already exists`, 'DUPLICATE');
    }

    const passwordHash = await Bun.password.hash(input.password, { algorithm: 'bcrypt', cost: 10 });

    const data: CreateTeacherData = {
      username: input.username,
      passwordHash,
      role: 'profesor',
      mustChangePassword: true,
      moduleId: input.moduleId,
    };

    return this.repo.save(data);
  }

  async update(id: number, data: { username?: string }): Promise<TeacherListItem> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError(`Teacher ${id} not found`, 'NOT_FOUND');
    }
    if (data.username !== undefined) {
      if (data.username.length < 4 || data.username.length > 20) {
        throw new AppError('Username must be between 4 and 20 characters', 'VALIDATION_ERROR');
      }
      const duplicate = await this.repo.findByUsername(data.username);
      if (duplicate && duplicate.id !== id) {
        throw new AppError(`Username '${data.username}' already exists`, 'DUPLICATE');
      }
    }
    return this.repo.update(id, data);
  }

  async unlock(id: number): Promise<{ id: number; accountLocked: boolean; failedLoginAttempts: number }> {
    const teacher = await this.repo.findById(id);
    if (!teacher) {
      throw new AppError(`Teacher ${id} not found`, 'NOT_FOUND');
    }

    await this.repo.resetFailedAttempts(id);

    return {
      id: teacher.id,
      accountLocked: false,
      failedLoginAttempts: 0,
    };
  }

  async delete(id: number): Promise<void> {
    const hasCorrections = await this.repo.hasCorrections(id);
    if (hasCorrections) {
      throw new AppError('Cannot delete teacher with correction records', 'HAS_DEPENDANTS');
    }
    await this.repo.delete(id);
  }
}
