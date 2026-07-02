import type { LegislationRepository, Legislation, LegislationFilters } from '../repositories/legislation.repository';

class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

export class LegislationService {
  constructor(private readonly repo: LegislationRepository) {}

  async list(filters: LegislationFilters): Promise<Legislation[]> {
    return this.repo.findAll(filters);
  }

  async create(name: string, startYear: number): Promise<Legislation> {
    if (!name || name.length < 2) {
      throw new AppError('Name must be at least 2 characters', 'VALIDATION_ERROR');
    }
    if (name.length > 10) {
      throw new AppError('Name must be at most 10 characters', 'VALIDATION_ERROR');
    }
    if (!/^[A-Z]+$/.test(name)) {
      throw new AppError('Name must be uppercase letters only', 'VALIDATION_ERROR');
    }
    if (startYear === undefined || startYear === null || typeof startYear !== 'number') {
      throw new AppError('Start year is required', 'VALIDATION_ERROR');
    }
    if (startYear < 1900 || startYear > 2099) {
      throw new AppError('Start year must be between 1900 and 2099', 'VALIDATION_ERROR');
    }

    const existing = await this.repo.findByName(name);
    if (existing) {
      throw new AppError(`Legislation '${name}' already exists`, 'DUPLICATE');
    }

    return this.repo.create(name, startYear);
  }

  async update(id: number, data: Partial<{ name: string; startYear: number }>): Promise<Legislation> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new AppError(`Legislation ${id} not found`, 'NOT_FOUND');
    }
    return this.repo.update(id, data);
  }

  async delete(id: number): Promise<void> {
    const hasModules = await this.repo.hasModules(id);
    if (hasModules) {
      throw new AppError('Cannot delete legislation with associated modules', 'HAS_DEPENDANTS');
    }
    await this.repo.delete(id);
  }
}
