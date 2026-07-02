export interface ProjectStudentSummary {
  studentId: number;
  name: string;
}

export interface ProjectStudentAssignment {
  projectId: number;
  projectName: string;
  studentId: number;
  studentName: string;
  moduleName: string;
}

export interface AssignResult {
  projectId: number;
  assigned: number[];
  totalStudents: number;
}

export interface ProjectStudentRepository {
  findByProject(projectId: number): Promise<ProjectStudentSummary[]>;
  findAll(): Promise<ProjectStudentAssignment[]>;
  countStudentsInProject(projectId: number): Promise<number>;
  isStudentInProjectThisYear(studentId: number, projectId: number): Promise<boolean>;
  isAssigned(projectId: number, studentId: number): Promise<boolean>;
  assign(projectId: number, studentIds: number[]): Promise<AssignResult>;
  unassign(projectId: number, studentId: number): Promise<void>;
}
