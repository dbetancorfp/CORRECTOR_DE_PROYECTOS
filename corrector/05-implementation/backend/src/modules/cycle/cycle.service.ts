import type { Cycle, CreateCycleDTO, UpdateCycleDTO } from "./cycle.entity";
import type { ICycleRepository } from "./cycle.repository";

export class CycleService {
  constructor(private readonly repo: ICycleRepository) {}

  async create(dto: CreateCycleDTO): Promise<Cycle> {
    this.validateName(dto.name);
    this.validateLegislationId(dto.legislation_id);

    const trimmedName = dto.name.trim();

    const legislationExists = await this.repo.legislationExists(dto.legislation_id);
    if (!legislationExists) {
      throw new Error(`Legislation with id ${dto.legislation_id} does not exist`);
    }

    const existing = await this.repo.getByNameAndLegislation(trimmedName, dto.legislation_id);
    if (existing) {
      throw new Error(`Cycle '${trimmedName}' already exists under legislation ${dto.legislation_id}`);
    }

    return this.repo.create({ name: trimmedName, legislation_id: dto.legislation_id });
  }

  async getAll(): Promise<Cycle[]> {
    return this.repo.getAll();
  }

  async getByLegislationId(legislationId: number): Promise<Cycle[]> {
    return this.repo.getByLegislationId(legislationId);
  }

  async getById(id: number): Promise<Cycle | null> {
    return this.repo.getById(id);
  }

  async update(id: number, dto: UpdateCycleDTO): Promise<Cycle | null> {
    if (dto.name !== undefined) {
      this.validateName(dto.name);
    }

    if (dto.legislation_id !== undefined) {
      this.validateLegislationId(dto.legislation_id);

      const legislationExists = await this.repo.legislationExists(dto.legislation_id);
      if (!legislationExists) {
        throw new Error(`Legislation with id ${dto.legislation_id} does not exist`);
      }
    }

    const updateData: UpdateCycleDTO = {};
    if (dto.name !== undefined) {
      updateData.name = dto.name.trim();
    }
    if (dto.legislation_id !== undefined) {
      updateData.legislation_id = dto.legislation_id;
    }

    if (updateData.name !== undefined || updateData.legislation_id !== undefined) {
      const existing = await this.repo.getById(id);
      if (!existing) return null;

      const checkName = updateData.name ?? existing.name;
      const checkLegislationId = updateData.legislation_id ?? existing.legislation_id;

      const duplicate = await this.repo.getByNameAndLegislation(checkName, checkLegislationId);
      if (duplicate && duplicate.id !== id) {
        throw new Error(`Cycle '${checkName}' already exists under legislation ${checkLegislationId}`);
      }
    }

    return this.repo.update(id, updateData);
  }

  async delete(id: number): Promise<Cycle | null> {
    return this.repo.delete(id);
  }

  private validateName(name: string): void {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      throw new Error("Cycle name must be between 1 and 120 characters");
    }
  }

  private validateLegislationId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error("legislation_id must be a positive integer");
    }
  }
}
