import type { ProjectStudentService, AssignedStudent } from '../services/project-student.service';
import type { StudentController, StudentRow } from './student-controller';
import type { Legislation } from '../services/legislation.service';
import type { Cycle } from '../services/cycle.service';
import type { Module } from '../services/module.service';

export type AssignState =
  | { status: 'success'; totalStudents: number }
  | { status: 'blocked'; message: string }
  | { status: 'error'; message: string };

export type UnassignState =
  | { status: 'success' }
  | { status: 'error'; message: string };

// Composes the existing StudentController rather than re-implementing the
// name/year/legislation/cycle/module cascade + filter logic it already has
// (#78–#82 need exactly what #55–#59 in corrector-students-form.ts already
// do). Only the assignment-specific behaviour (candidate pool minus already
// assigned, assign/unassign) lives here.
export class AssignmentController {
  constructor(
    private readonly projectStudentService: ProjectStudentService,
    private readonly studentController: StudentController,
  ) {}

  async loadAssignedStudents(projectId: number): Promise<AssignedStudent[]> {
    const result = await this.projectStudentService.listForProject(projectId);
    return result.ok ? result.items : [];
  }

  async loadCandidates(
    projectId: number,
    nameQuery: string,
    yearQuery: string,
    legislationQuery: string,
    cycleQuery: string,
    moduleQuery: string,
  ): Promise<StudentRow[]> {
    const [pool, assigned] = await Promise.all([
      this.studentController.filterRows(nameQuery, yearQuery, legislationQuery, cycleQuery, moduleQuery),
      this.loadAssignedStudents(projectId),
    ]);
    const assignedIds = new Set(assigned.map((a) => a.studentId));
    return pool.filter((s) => !assignedIds.has(s.id));
  }

  async loadYearOptions(): Promise<number[]> {
    return this.studentController.loadYearOptions();
  }

  async loadLegislationOptions(year: number | null): Promise<Legislation[]> {
    return this.studentController.loadLegislationOptions(year);
  }

  async loadCycleOptions(legislationId: number | null): Promise<Cycle[]> {
    return this.studentController.loadCycleOptions(legislationId);
  }

  async loadModuleOptions(cycleId: number | null): Promise<Module[]> {
    return this.studentController.loadModuleOptions(cycleId);
  }

  async assign(projectId: number, studentIds: number[]): Promise<AssignState> {
    const result = await this.projectStudentService.assign(projectId, studentIds);
    if (result.ok) return { status: 'success', totalStudents: result.totalStudents };

    if (result.code === 'LIMIT_EXCEEDED') {
      return { status: 'blocked', message: 'No se puede asignar: se superaría el máximo de 3 alumnos por proyecto.' };
    }
    if (result.code === 'YEAR_CONFLICT') {
      return { status: 'blocked', message: 'Uno o más alumnos ya están asignados a otro proyecto este curso.' };
    }
    return { status: 'error', message: 'No se pudo asignar a los alumnos' };
  }

  async unassign(projectId: number, studentId: number): Promise<UnassignState> {
    const result = await this.projectStudentService.unassign(projectId, studentId);
    if (result.ok) return { status: 'success' };
    return { status: 'error', message: 'No se pudo quitar al alumno' };
  }
}
