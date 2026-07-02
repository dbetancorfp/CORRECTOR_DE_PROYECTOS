export interface Cycle {
  id: number;
  name: string;
}

export interface CycleFilters {
  name?: string;
  legislationId?: number;
  year?: number;
}

export interface CycleRepository {
  findAll(filters?: CycleFilters): Promise<Cycle[]>;
  findById(id: number): Promise<Cycle | null>;
  findByName(name: string): Promise<Cycle | null>;
  create(name: string): Promise<Cycle>;
  update(id: number, name: string): Promise<Cycle>;
  delete(id: number): Promise<void>;
  hasModules(id: number): Promise<boolean>;
}
