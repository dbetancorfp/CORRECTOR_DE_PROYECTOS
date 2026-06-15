import type { Legislation, CreateLegislationDTO, UpdateLegislationDTO } from "./legislation.entity";
import type { ILegislationRepository } from "./legislation.repository";

export class LegislationService {
  constructor(private readonly repo: ILegislationRepository) {}

  async create(dto: CreateLegislationDTO): Promise<Legislation> {
    this.validateName(dto.name);
    this.validateStartYear(dto.start_year);

    const existing = await this.repo.getByName(dto.name.trim());
    if (existing) {
      throw new Error(`Legislation with name '${dto.name.trim()}' already exists`);
    }

    return this.repo.create({
      name: dto.name.trim(),
      start_year: dto.start_year,
    });
  }

  async getAll(): Promise<Legislation[]> {
    return this.repo.getAll();
  }

  async getById(id: number): Promise<Legislation | null> {
    return this.repo.getById(id);
  }

  async update(id: number, dto: UpdateLegislationDTO): Promise<Legislation | null> {
    if (dto.name !== undefined) {
      this.validateName(dto.name);

      const existing = await this.repo.getByName(dto.name.trim());
      if (existing && existing.id !== id) {
        throw new Error(`Legislation with name '${dto.name.trim()}' already exists`);
      }
    }

    if (dto.start_year !== undefined) {
      this.validateStartYear(dto.start_year);
    }

    const updateData: UpdateLegislationDTO = {};
    if (dto.name !== undefined) updateData.name = dto.name.trim();
    if (dto.start_year !== undefined) updateData.start_year = dto.start_year;

    return this.repo.update(id, updateData);
  }

  async delete(id: number): Promise<Legislation | null> {
    return this.repo.delete(id);
  }

  private validateName(name: string): void {
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 20) {
      throw new Error("Name must be between 1 and 20 characters");
    }
  }

  private validateStartYear(year: number): void {
    if (!Number.isInteger(year) || year <= 1900) {
      throw new Error("Start year must be greater than 1900");
    }
  }
}
