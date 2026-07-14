// Shapes shared verbatim between backend/src/services/grade.service.ts
// (produces them) and frontend/src/services/grade.service.ts (the HTTP
// client's response types describe the exact same wire format) — kept in
// one place instead of two copies drifting apart.
export interface ModuleGradeEntry {
  studentName: string;
  projectName: string;
  moduleScore: number;
}

export interface CycleGradeEntry {
  studentName: string;
  projectName: string;
  moduleScores: Record<string, number>;
  finalScore: number;
}

export interface CycleGradeResult {
  modules: Array<{ id: number; name: string; weeklyHours: number }>;
  grades: CycleGradeEntry[];
}

export interface CorrectionStatusEntry {
  moduleId: number;
  moduleName: string;
  totalStudents: number;
  correctedStudents: number;
  status: 'complete' | 'incomplete';
}
