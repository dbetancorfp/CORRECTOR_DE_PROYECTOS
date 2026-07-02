import type { ProjectRepository, Project, CreateProjectData, ProjectFilters } from '../repositories/project.repository';

const ACADEMIC_YEAR_RE = /^\d{4}-\d{4}$/;

class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

export class ProjectService {
  constructor(private readonly repo: ProjectRepository) {}

  async list(filters?: ProjectFilters): Promise<Project[]> {
    return this.repo.findAll(filters);
  }

  async create(data: CreateProjectData): Promise<Project> {
    if (!data.name || data.name.length < 2) {
      throw new AppError('Name must be at least 2 characters', 'VALIDATION_ERROR');
    }
    if (!data.academicYear || !ACADEMIC_YEAR_RE.test(data.academicYear)) {
      throw new AppError('Academic year must be in format YYYY-YYYY', 'VALIDATION_ERROR');
    }
    if (!data.moduleId) {
      throw new AppError('Module is required', 'VALIDATION_ERROR');
    }

    return this.repo.create(data);
  }

  async delete(id: number): Promise<void> {
    const hasStudents = await this.repo.hasStudents(id);
    if (hasStudents) {
      throw new AppError('Cannot delete project with assigned students', 'HAS_DEPENDANTS');
    }
    await this.repo.delete(id);
  }
}
