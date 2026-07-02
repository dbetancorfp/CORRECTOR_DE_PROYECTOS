import type { CorrectionRepository } from '../repositories/correction.repository';
import type { ModuleRepository } from '../repositories/module.repository';
import type { StudentRepository } from '../repositories/student.repository';
import type { Project, ProjectRepository } from '../repositories/project.repository';
import type { ProjectStudentRepository } from '../repositories/project-student.repository';
import { GradeCalculator } from './grade-calculator';

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

    const moduleEntries = await Promise.all(
      modules.map(async (m) => {
        const corrections = await this.correctionRepo.findAll({
          moduleId: m.id,
          academicYear,
        });
        return { module: m, corrections };
      }),
    );

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

    const grades = Array.from(studentMap.values()).map((entry) => {
      const moduleGrades = modules.map((m) => ({
        moduleScore: entry.moduleScores[String(m.id)] ?? 0,
        weeklyHours: m.weeklyHours,
      }));
      return { ...entry, finalScore: this.calculator.calculateFinalScore(moduleGrades) };
    });

    grades.sort((a, b) => {
      const p = a.projectName.localeCompare(b.projectName);
      return p !== 0 ? p : a.studentName.localeCompare(b.studentName);
    });

    return {
      modules: modules.map((m) => ({ id: m.id, name: m.name, weeklyHours: m.weeklyHours })),
      grades,
    };
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
