import type { CycleRepository, Cycle, CycleFilters } from '../repositories/cycle.repository';

class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

export class CycleService {
  constructor(private readonly repo: CycleRepository) {}

  async list(filters?: CycleFilters): Promise<Cycle[]> {
    return this.repo.findAll(filters);
  }

  async create(name: string, _navigationAids?: { legislationId?: number; year?: number }): Promise<Cycle> {
    if (!name || name.length < 3) {
      throw new AppError('Name must be at least 3 characters', 'VALIDATION_ERROR');
    }
    if (name.length > 100) {
      throw new AppError('Name must be at most 100 characters', 'VALIDATION_ERROR');
    }

    const existing = await this.repo.findByName(name);
    if (existing) {
      throw new AppError(`Cycle '${name}' already exists`, 'DUPLICATE');
    }

    return this.repo.create(name);
  }

  async update(id: number, name: string): Promise<Cycle> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError(`Cycle ${id} not found`, 'NOT_FOUND');
    }
    const duplicate = await this.repo.findByName(name);
    if (duplicate && duplicate.id !== id) {
      throw new AppError(`Cycle '${name}' already exists`, 'DUPLICATE');
    }
    return this.repo.update(id, name);
  }

  async delete(id: number): Promise<void> {
    const hasModules = await this.repo.hasModules(id);
    if (hasModules) {
      throw new AppError('Cannot delete cycle with associated modules', 'HAS_DEPENDANTS');
    }
    await this.repo.delete(id);
  }
}
