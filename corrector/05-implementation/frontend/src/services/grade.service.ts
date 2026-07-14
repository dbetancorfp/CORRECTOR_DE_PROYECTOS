import type {
  ModuleGradeEntry,
  CycleGradeEntry,
  CycleGradeResult,
  CorrectionStatusEntry,
} from '../../../shared/grade-types';

export type { ModuleGradeEntry, CycleGradeEntry, CycleGradeResult, CorrectionStatusEntry };

export interface ApiFailure {
  ok: false;
  status: number;
}

export interface ModuleGradesSuccess {
  ok: true;
  items: ModuleGradeEntry[];
}

export interface CycleGradesSuccess {
  ok: true;
  item: CycleGradeResult;
}

export interface CorrectionStatusSuccess {
  ok: true;
  items: CorrectionStatusEntry[];
}

export interface DownloadSuccess {
  ok: true;
}

export type ModuleGradesResult = ModuleGradesSuccess | ApiFailure;
export type CycleGradesResult = CycleGradesSuccess | ApiFailure;
export type CorrectionStatusResult = CorrectionStatusSuccess | ApiFailure;
export type DownloadResult = DownloadSuccess | ApiFailure;

export interface GradeService {
  getModuleGrades(moduleId: number, academicYear: string): Promise<ModuleGradesResult>;
  getCycleGrades(cycleId: number, academicYear: string): Promise<CycleGradesResult>;
  getCorrectionStatus(cycleId: number, academicYear: string): Promise<CorrectionStatusResult>;
  downloadPdf(projectId: number, academicYear: string): Promise<DownloadResult>;
}

export class HttpGradeService implements GradeService {
  async getModuleGrades(moduleId: number, academicYear: string): Promise<ModuleGradesResult> {
    const res = await fetch(`/api/modules/${moduleId}/grades?academicYear=${encodeURIComponent(academicYear)}`);
    if (!res.ok) return { ok: false, status: res.status };
    const body = await res.json() as { grades: ModuleGradeEntry[] };
    return { ok: true, items: body.grades };
  }

  async getCycleGrades(cycleId: number, academicYear: string): Promise<CycleGradesResult> {
    const res = await fetch(`/api/cycles/${cycleId}/grades?academicYear=${encodeURIComponent(academicYear)}`);
    if (!res.ok) return { ok: false, status: res.status };
    const item = await res.json() as CycleGradeResult;
    return { ok: true, item };
  }

  async getCorrectionStatus(cycleId: number, academicYear: string): Promise<CorrectionStatusResult> {
    const res = await fetch(`/api/cycles/${cycleId}/correction-status?academicYear=${encodeURIComponent(academicYear)}`);
    if (!res.ok) return { ok: false, status: res.status };
    const body = await res.json() as { modules: CorrectionStatusEntry[] };
    return { ok: true, items: body.modules };
  }

  async downloadPdf(projectId: number, academicYear: string): Promise<DownloadResult> {
    const res = await fetch(`/api/projects/${projectId}/grades/pdf?academicYear=${encodeURIComponent(academicYear)}`);
    if (!res.ok) return { ok: false, status: res.status };
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `notas-${projectId}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    return { ok: true };
  }
}
