import type { StudentRepository, Student, CreateStudentData, StudentFilters } from '../repositories/student.repository';

class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

export class StudentService {
  constructor(private readonly repo: StudentRepository) {}

  async list(filters?: StudentFilters): Promise<Student[]> {
    return this.repo.findAll(filters);
  }

  async create(data: CreateStudentData): Promise<Student> {
    if (!data.name || data.name.length < 2) {
      throw new AppError('Name must be at least 2 characters', 'VALIDATION_ERROR');
    }
    if (!data.cycleId) {
      throw new AppError('Cycle is required', 'VALIDATION_ERROR');
    }
    if (!data.moduleId) {
      throw new AppError('Module is required', 'VALIDATION_ERROR');
    }

    return this.repo.create(data);
  }

  async update(id: number, data: Partial<CreateStudentData>): Promise<Student> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError(`Student ${id} not found`, 'NOT_FOUND');
    }
    if (data.name !== undefined && data.name.length < 2) {
      throw new AppError('Name must be at least 2 characters', 'VALIDATION_ERROR');
    }
    return this.repo.update(id, data);
  }

  async delete(id: number): Promise<void> {
    const assigned = await this.repo.isAssignedToProject(id);
    if (assigned) {
      throw new AppError('Cannot delete student assigned to a project', 'HAS_DEPENDANTS');
    }
    await this.repo.delete(id);
  }
}
