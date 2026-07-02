export interface Student {
  id: number;
  name: string;
  cycleId: number;
  cycleName: string;
  modules: Array<{ id: number; name: string }>;
}

export interface CreateStudentData {
  name: string;
  cycleId: number;
  moduleId: number;
}

export interface StudentFilters {
  name?: string;
  cycleId?: number;
  moduleId?: number;
}

export interface StudentRepository {
  findAll(filters?: StudentFilters): Promise<Student[]>;
  findById(id: number): Promise<Student | null>;
  create(data: CreateStudentData): Promise<Student>;
  update(id: number, data: Partial<CreateStudentData>): Promise<Student>;
  delete(id: number): Promise<void>;
  isAssignedToProject(id: number): Promise<boolean>;
}
