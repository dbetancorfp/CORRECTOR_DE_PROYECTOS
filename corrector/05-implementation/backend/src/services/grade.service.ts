import type { CorrectionRepository, CorrectionResult } from '../repositories/correction.repository';
import type { Module, ModuleRepository } from '../repositories/module.repository';
import type { StudentRepository } from '../repositories/student.repository';
import type { Project, ProjectRepository } from '../repositories/project.repository';
import type { ProjectStudentRepository } from '../repositories/project-student.repository';
import { GradeCalculator } from './grade-calculator';
import type {
  ModuleGradeEntry,
  CycleGradeEntry,
  CycleGradeResult,
  CorrectionStatusEntry,
  ProjectGradeTable,
} from '../../../shared/grade-types';

export class GradeService {
  constructor(
    private readonly correctionRepo: CorrectionRepository,
    private readonly moduleRepo: ModuleRepository,
    private readonly studentRepo: StudentRepository,
    private readonly projectRepo: ProjectRepository,
    private readonly psRepo: ProjectStudentRepository,
    private readonly calculator: GradeCalculator,
  ) {}

  async findProject(id: number): Promise<Project | null> {
    return this.projectRepo.findById(id);
  }

  async getModuleGrades(moduleId: number, academicYear?: string): Promise<ModuleGradeEntry[]> {
    const corrections = await this.correctionRepo.findAll({ moduleId, academicYear });

    const grades = await Promise.all(
      corrections.map(async (c) => {
        const student = await this.studentRepo.findById(c.studentId);
        const project = await this.projectRepo.findById(c.projectId);
        return {
          studentName: student?.name ?? '',
          projectName: project?.name ?? '',
          moduleScore: c.finalScore,
        };
      }),
    );

    grades.sort((a, b) => {
      const p = a.projectName.localeCompare(b.projectName);
      return p !== 0 ? p : a.studentName.localeCompare(b.studentName);
    });

    return grades;
  }

  async getCycleGrades(cycleId: number, academicYear?: string): Promise<CycleGradeResult> {
    const modules = await this.moduleRepo.findAll({ cycleId });
    const moduleEntries = await this._cycleModuleEntries(modules, academicYear);

    const studentMap = new Map<
      number,
      { studentName: string; projectName: string; moduleScores: Record<string, number> }
    >();

    for (const { module: m, corrections } of moduleEntries) {
      for (const c of corrections) {
        const student = await this.studentRepo.findById(c.studentId);
        const project = await this.projectRepo.findById(c.projectId);
        if (!studentMap.has(c.studentId)) {
          studentMap.set(c.studentId, {
            studentName: student?.name ?? '',
            projectName: project?.name ?? '',
            moduleScores: {},
          });
        }
        const entry = studentMap.get(c.studentId)!;
        entry.moduleScores[String(m.id)] = c.finalScore;
      }
    }

    const grades = Array.from(studentMap.values()).map((entry) => ({
      ...entry,
      finalScore: this._finalScore(entry, modules),
    }));

    grades.sort((a, b) => {
      const p = a.projectName.localeCompare(b.projectName);
      return p !== 0 ? p : a.studentName.localeCompare(b.studentName);
    });

    return {
      modules: modules.map((m) => ({ id: m.id, name: m.name, weeklyHours: m.weeklyHours })),
      grades,
    };
  }

  // Element #120 — content of the PDF for one project's students, scoped by
  // role exactly like table #119: tutor sees the cycle panorama, everyone
  // else sees only the project's home module.
  async getProjectGradeTable(
    project: Project,
    academicYear: string,
    role: 'admin' | 'profesor' | 'tutor',
  ): Promise<ProjectGradeTable> {
    const students = await this.psRepo.findByProject(project.id);
    const studentIds = new Set(students.map((s) => s.studentId));

    if (role === 'tutor') {
      const homeModule = await this.moduleRepo.findById(project.moduleId);
      const modules = homeModule ? await this.moduleRepo.findAll({ cycleId: homeModule.cycleId }) : [];
      const moduleEntries = await this._cycleModuleEntries(modules, academicYear);

      const studentMap = new Map<number, { studentName: string; moduleScores: Record<string, number> }>();
      for (const { module: m, corrections } of moduleEntries) {
        for (const c of corrections.filter((entry) => studentIds.has(entry.studentId))) {
          if (!studentMap.has(c.studentId)) {
            const student = await this.studentRepo.findById(c.studentId);
            studentMap.set(c.studentId, { studentName: student?.name ?? '', moduleScores: {} });
          }
          studentMap.get(c.studentId)!.moduleScores[String(m.id)] = c.finalScore;
        }
      }

      const rows = Array.from(studentMap.values())
        .map((entry) => ({ ...entry, finalScore: this._finalScore(entry, modules) }))
        .sort((a, b) => a.studentName.localeCompare(b.studentName));

      return {
        role: 'tutor',
        projectName: project.name,
        modules: modules.map((m) => ({ id: m.id, name: m.name })),
        rows,
      };
    }

    const corrections = (
      await this.correctionRepo.findAll({ moduleId: project.moduleId, academicYear })
    ).filter((c) => studentIds.has(c.studentId));

    const rows = await Promise.all(
      corrections.map(async (c) => {
        const student = await this.studentRepo.findById(c.studentId);
        return { studentName: student?.name ?? '', moduleScore: c.finalScore };
      }),
    );
    rows.sort((a, b) => a.studentName.localeCompare(b.studentName));

    return { role: 'profesor', projectName: project.name, moduleName: project.moduleName, rows };
  }

  private async _cycleModuleEntries(
    modules: Module[],
    academicYear?: string,
  ): Promise<Array<{ module: Module; corrections: CorrectionResult[] }>> {
    return Promise.all(
      modules.map(async (m) => ({
        module: m,
        corrections: await this.correctionRepo.findAll({ moduleId: m.id, academicYear }),
      })),
    );
  }

  private _finalScore(entry: { moduleScores: Record<string, number> }, modules: Module[]): number {
    const moduleGrades = modules.map((m) => ({
      moduleScore: entry.moduleScores[String(m.id)] ?? 0,
      weeklyHours: m.weeklyHours,
    }));
    return this.calculator.calculateFinalScore(moduleGrades);
  }

  async getCorrectionStatus(
    cycleId: number,
    academicYear?: string,
  ): Promise<CorrectionStatusEntry[]> {
    const modules = await this.moduleRepo.findAll({ cycleId });

    return Promise.all(
      modules.map(async (m) => {
        const projects = await this.projectRepo.findAll({ moduleId: m.id });
        const projectIds = projects.map((p) => p.id);

        const allStudentIds = new Set<number>();
        for (const pid of projectIds) {
          const students = await this.psRepo.findByProject(pid);
          for (const s of students) allStudentIds.add(s.studentId);
        }

        const corrections = await this.correctionRepo.findAll({
          moduleId: m.id,
          academicYear,
        });

        const correctedIds = new Set(
          corrections
            .filter((c) => allStudentIds.has(c.studentId))
            .map((c) => c.studentId),
        );

        const totalStudents = allStudentIds.size;
        const correctedStudents = correctedIds.size;
        const status = correctedStudents >= totalStudents ? 'complete' : 'incomplete';

        return { moduleId: m.id, moduleName: m.name, totalStudents, correctedStudents, status };
      }),
    );
  }
}
