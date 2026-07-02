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

export interface CorrectionResult {
  id: number;
  studentId: number;
  moduleId: number;
  rubricId: number;
  finalScore: number;
  items: CorrectionItem[];
}

export interface CorrectionRepository {
  findByStudentAndProject(studentId: number, projectId: number): Promise<CorrectionResult | null>;
  upsert(data: UpsertCorrectionData): Promise<CorrectionResult>;
}
