import type {
  GradeService, ModuleGradeEntry, CycleGradeResult, CorrectionStatusEntry,
} from '../services/grade.service';
import type { AuthService, TeacherRole } from '../services/auth.service';
import type { TeacherService } from '../services/teacher.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import type { Module, ModuleService } from '../services/module.service';

export interface ProfesorGradeRow {
  projectName: string;
  studentName: string;
  moduleScore: number;
}

export interface TutorGradeRow {
  projectName: string;
  studentName: string;
  moduleScores: Record<string, number>;
  finalScore: number;
}

export type GradeTableData =
  | { role: 'profesor'; rows: ProfesorGradeRow[] }
  | { role: 'tutor'; modules: Array<{ id: number; name: string }>; rows: TutorGradeRow[] };

// Module abbreviations aren't a dedicated schema field — the boceto's own
// data follows "Full name (ABBR)" throughout (see fixture data across every
// screen this session), so the badge label is extracted from the trailing
// parenthesis, falling back to the full name when there isn't one.
export function moduleAbbreviation(name: string): string {
  const match = /\(([^)]+)\)\s*$/.exec(name);
  return match ? match[1] : name;
}

export class GradesViewController {
  constructor(
    private readonly gradeService: GradeService,
    private readonly authService: AuthService,
    private readonly teacherService: TeacherService,
    private readonly legislationService: LegislationService,
    private readonly cycleService: CycleService,
    private readonly moduleService: ModuleService,
  ) {}

  async loadRole(): Promise<{ role: TeacherRole; teacherId: number } | null> {
    const result = await this.authService.me();
    if (!result.ok) return null;
    return { role: result.role, teacherId: result.id };
  }

  async loadYearOptions(): Promise<number[]> {
    const result = await this.legislationService.list();
    if (!result.ok) return [];
    return Array.from(new Set(result.items.map((l) => l.startYear))).sort((a, b) => a - b);
  }

  async loadLegislationOptions(year: number | null): Promise<Legislation[]> {
    if (year === null) return [];
    const result = await this.legislationService.list();
    if (!result.ok) return [];
    return result.items.filter((l) => l.startYear === year);
  }

  async loadCycleOptions(legislationId: number | null): Promise<Cycle[]> {
    if (legislationId === null) return [];
    const result = await this.cycleService.list({ legislationId });
    return result.ok ? result.items : [];
  }

  // rol='profesor': solo su(s) propio(s) módulo(s) (vía teacher_module).
  // rol='tutor': todos los módulos del ciclo.
  async loadModuleOptions(cycleId: number | null, role: TeacherRole, teacherId: number): Promise<Module[]> {
    if (cycleId === null) return [];
    const result = await this.moduleService.list();
    if (!result.ok) return [];
    const inCycle = result.items.filter((m) => m.cycleId === cycleId);
    if (role === 'tutor') return inCycle;

    const teachersResult = await this.teacherService.list();
    if (!teachersResult.ok) return [];
    const me = teachersResult.items.find((t) => t.id === teacherId);
    const myModuleIds = new Set((me?.modules ?? []).map((m) => m.id));
    return inCycle.filter((m) => myModuleIds.has(m.id));
  }

  async loadCorrectionStatus(cycleId: number, academicYear: string): Promise<CorrectionStatusEntry[]> {
    const result = await this.gradeService.getCorrectionStatus(cycleId, academicYear);
    return result.ok ? result.items : [];
  }

  async loadTable(
    role: TeacherRole,
    moduleId: number,
    cycleId: number,
    academicYear: string,
  ): Promise<GradeTableData> {
    if (role === 'profesor') {
      const result = await this.gradeService.getModuleGrades(moduleId, academicYear);
      const rows: ModuleGradeEntry[] = result.ok ? result.items : [];
      return { role: 'profesor', rows };
    }

    const result = await this.gradeService.getCycleGrades(cycleId, academicYear);
    const data: CycleGradeResult = result.ok ? result.item : { modules: [], grades: [] };
    return {
      role: 'tutor',
      modules: data.modules.map((m) => ({ id: m.id, name: m.name })),
      rows: data.grades,
    };
  }

  async downloadPdf(projectId: number, academicYear: string): Promise<boolean> {
    const result = await this.gradeService.downloadPdf(projectId, academicYear);
    return result.ok;
  }
}
