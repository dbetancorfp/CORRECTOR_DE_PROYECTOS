export interface CorrectionItem {
  rubricItemId: number;
  rubricLevelId: number;
}

export interface UpsertCorrectionData {
  studentId: number;
  projectId: number;
  moduleId: number;
  rubricId: number;
  academicYear: string;
  items: CorrectionItem[];
  finalScore?: number;
}

export interface CorrectionFilters {
  moduleId?: number;
  academicYear?: string;
}

export interface CorrectionResult {
  id: number;
  studentId: number;
  projectId: number;
  moduleId: number;
  rubricId: number;
  academicYear: string;
  finalScore: number;
  items: CorrectionItem[];
}

export interface CorrectionRepository {
  findAll(filters?: CorrectionFilters): Promise<CorrectionResult[]>;
  findByStudentAndProject(studentId: number, projectId: number): Promise<CorrectionResult | null>;
  upsert(data: UpsertCorrectionData): Promise<CorrectionResult>;
}
