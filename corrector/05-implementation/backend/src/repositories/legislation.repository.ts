export interface Legislation {
  id: number;
  name: string;
  startYear: number;
}

export interface LegislationFilters {
  year?: number;
  name?: string;
}

export interface LegislationRepository {
  findAll(filters?: LegislationFilters): Promise<Legislation[]>;
  findById(id: number): Promise<Legislation | null>;
  findByName(name: string): Promise<Legislation | null>;
  create(name: string, startYear: number): Promise<Legislation>;
  update(id: number, data: Partial<{ name: string; startYear: number }>): Promise<Legislation>;
  delete(id: number): Promise<void>;
  hasModules(id: number): Promise<boolean>;
}
