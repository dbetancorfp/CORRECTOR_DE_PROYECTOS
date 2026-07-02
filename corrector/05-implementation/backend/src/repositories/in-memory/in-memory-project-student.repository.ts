import type {
  ProjectStudentRepository,
  ProjectStudentSummary,
  ProjectStudentAssignment,
  AssignResult,
} from '../project-student.repository';
import type { Store } from './store';

export class InMemoryProjectStudentRepository implements ProjectStudentRepository {
  constructor(private readonly store: Store) {}

  async findByProject(projectId: number): Promise<ProjectStudentSummary[]> {
    const rows = this.store.projectStudents.filter((ps) => ps.projectId === projectId);
    return rows.map((ps) => {
      const student = this.store.students.find((s) => s.id === ps.studentId);
      return { studentId: ps.studentId, name: student?.name ?? '' };
    });
  }

  async findAll(): Promise<ProjectStudentAssignment[]> {
    return this.store.projectStudents.map((ps) => {
      const project = this.store.projects.find((p) => p.id === ps.projectId);
      const student = this.store.students.find((s) => s.id === ps.studentId);
      const mod = project
        ? this.store.modules.find((m) => m.id === project.moduleId)
        : null;
      return {
        projectId: ps.projectId,
        projectName: project?.name ?? '',
        studentId: ps.studentId,
        studentName: student?.name ?? '',
        moduleName: mod?.name ?? '',
      };
    });
  }

  async countStudentsInProject(projectId: number): Promise<number> {
    return this.store.projectStudents.filter((ps) => ps.projectId === projectId).length;
  }

  async isStudentInProjectThisYear(studentId: number, projectId: number): Promise<boolean> {
    const targetProject = this.store.projects.find((p) => p.id === projectId);
    if (!targetProject) return false;
    const year = targetProject.academicYear;
    const studentProjectIds = this.store.projectStudents
      .filter((ps) => ps.studentId === studentId && ps.projectId !== projectId)
      .map((ps) => ps.projectId);
    const conflictingProjects = this.store.projects.filter(
      (p) => studentProjectIds.includes(p.id) && p.academicYear === year,
    );
    return conflictingProjects.length > 0;
  }

  async assign(projectId: number, studentIds: number[]): Promise<AssignResult> {
    const added: number[] = [];
    for (const studentId of studentIds) {
      const exists = this.store.projectStudents.some(
        (ps) => ps.projectId === projectId && ps.studentId === studentId,
      );
      if (!exists) {
        this.store.projectStudents.push({ projectId, studentId });
        added.push(studentId);
      }
    }
    const total = this.store.projectStudents.filter((ps) => ps.projectId === projectId).length;
    return { projectId, assigned: added, totalStudents: total };
  }

  async unassign(projectId: number, studentId: number): Promise<void> {
    this.store.projectStudents = this.store.projectStudents.filter(
      (ps) => !(ps.projectId === projectId && ps.studentId === studentId),
    );
  }
}
