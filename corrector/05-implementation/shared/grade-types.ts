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

// Element #120 — content of the grades PDF, scoped to one project's students.
// Mirrors GradeTableData (frontend/src/controllers/grades-view-controller.ts)
// so the PDF matches what table #119 shows on screen for the same role.
export interface ProjectProfesorGradeRow {
  studentName: string;
  moduleScore: number;
}

export interface ProjectTutorGradeRow {
  studentName: string;
  moduleScores: Record<string, number>;
  finalScore: number;
}

export type ProjectGradeTable =
  | { role: 'profesor'; projectName: string; moduleName: string; rows: ProjectProfesorGradeRow[] }
  | {
      role: 'tutor';
      projectName: string;
      modules: Array<{ id: number; name: string }>;
      rows: ProjectTutorGradeRow[];
    };
