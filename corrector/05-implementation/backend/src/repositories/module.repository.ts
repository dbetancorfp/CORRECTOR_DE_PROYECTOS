export interface Module {
  id: number;
  name: string;
  weeklyHours: number;
  cycleId: number;
  cycleName: string;
  legislationId: number;
  legislationName: string;
}

export interface CreateModuleData {
  name: string;
  weeklyHours: number;
  cycleId: number;
  legislationId: number;
}

export interface ModuleFilters {
  name?: string;
  cycleId?: number;
  legislationId?: number;
  year?: number;
  teacherId?: number;
}

export interface ModuleRepository {
  findAll(filters?: ModuleFilters): Promise<Module[]>;
  findById(id: number): Promise<Module | null>;
  findByNameAndCycle(name: string, cycleId: number, legislationId: number): Promise<Module | null>;
  create(data: CreateModuleData): Promise<Module>;
  update(id: number, data: Partial<CreateModuleData>): Promise<Module>;
  delete(id: number): Promise<void>;
  hasProjects(id: number): Promise<boolean>;
  hasRubric(id: number): Promise<boolean>;
  hasCorrections(id: number): Promise<boolean>;
  isTeacherAssigned(teacherId: number, moduleId: number): Promise<boolean>;
}
