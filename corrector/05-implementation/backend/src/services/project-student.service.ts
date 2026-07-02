import type {
  ProjectStudentRepository,
  ProjectStudentSummary,
  AssignResult,
} from '../repositories/project-student.repository';

const MAX_STUDENTS_PER_PROJECT = 3;

class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

export class ProjectStudentService {
  constructor(private readonly repo: ProjectStudentRepository) {}

  async getStudentsForProject(projectId: number): Promise<ProjectStudentSummary[]> {
    return this.repo.findByProject(projectId);
  }

  async assign(projectId: number, studentIds: number[]): Promise<AssignResult> {
    const currentCount = await this.repo.countStudentsInProject(projectId);

    if (currentCount + studentIds.length > MAX_STUDENTS_PER_PROJECT) {
      throw new AppError(
        `Cannot assign: would exceed maximum of ${MAX_STUDENTS_PER_PROJECT} students per project`,
        'LIMIT_EXCEEDED',
      );
    }

    for (const studentId of studentIds) {
      const conflict = await this.repo.isStudentInProjectThisYear(studentId, projectId);
      if (conflict) {
        throw new AppError(
          `Student ${studentId} is already assigned to another project this academic year`,
          'YEAR_CONFLICT',
        );
      }
    }

    return this.repo.assign(projectId, studentIds);
  }

  async unassign(projectId: number, studentId: number): Promise<void> {
    const exists = await this.repo.isAssigned(projectId, studentId);
    if (!exists) {
      throw new AppError('Assignment not found', 'NOT_FOUND');
    }
    await this.repo.unassign(projectId, studentId);
  }
}
