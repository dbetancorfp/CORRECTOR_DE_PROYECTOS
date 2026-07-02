export interface Project {
  id: number;
  name: string;
  academicYear: string;
  moduleId: number;
  moduleName: string;
  cycleName: string;
  studentCount: number;
}

export interface CreateProjectData {
  name: string;
  academicYear: string;
  moduleId: number;
}

export interface ProjectFilters {
  name?: string;
  academicYear?: string;
  moduleId?: number;
  legislationId?: number;
}

export interface ProjectRepository {
  findAll(filters?: ProjectFilters): Promise<Project[]>;
  findById(id: number): Promise<Project | null>;
  create(data: CreateProjectData): Promise<Project>;
  update(id: number, data: Partial<CreateProjectData>): Promise<Project>;
  delete(id: number): Promise<void>;
  hasStudents(id: number): Promise<boolean>;
}
