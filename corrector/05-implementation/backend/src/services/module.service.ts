import type { ModuleRepository, Module, CreateModuleData, ModuleFilters } from '../repositories/module.repository';

class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

export class ModuleService {
  constructor(private readonly repo: ModuleRepository) {}

  async list(filters?: ModuleFilters): Promise<Module[]> {
    return this.repo.findAll(filters);
  }

  async create(data: CreateModuleData): Promise<Module> {
    if (!data.name || data.name.length < 1) {
      throw new AppError('Name is required', 'VALIDATION_ERROR');
    }
    if (
      data.weeklyHours === undefined ||
      data.weeklyHours === null ||
      !Number.isInteger(data.weeklyHours) ||
      data.weeklyHours < 1 ||
      data.weeklyHours > 30
    ) {
      throw new AppError('Weekly hours must be an integer between 1 and 30', 'VALIDATION_ERROR');
    }
    if (!data.legislationId) {
      throw new AppError('Legislation is required', 'VALIDATION_ERROR');
    }
    if (!data.cycleId) {
      throw new AppError('Cycle is required', 'VALIDATION_ERROR');
    }

    const existing = await this.repo.findByNameAndCycle(data.name, data.cycleId, data.legislationId);
    if (existing) {
      throw new AppError('Module already exists in this cycle and legislation', 'DUPLICATE');
    }

    return this.repo.create(data);
  }

  async update(id: number, data: Partial<CreateModuleData>): Promise<Module> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError(`Module ${id} not found`, 'NOT_FOUND');
    }
    if (
      data.weeklyHours !== undefined &&
      (!Number.isInteger(data.weeklyHours) || data.weeklyHours < 1 || data.weeklyHours > 30)
    ) {
      throw new AppError('Weekly hours must be an integer between 1 and 30', 'VALIDATION_ERROR');
    }
    return this.repo.update(id, data);
  }

  async delete(id: number): Promise<void> {
    const hasProjects = await this.repo.hasProjects(id);
    if (hasProjects) {
      throw new AppError('Cannot delete module with associated projects', 'HAS_DEPENDANTS');
    }
    await this.repo.delete(id);
  }
}
