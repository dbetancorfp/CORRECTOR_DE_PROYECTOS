import type { CorrectionService, CorrectionItemInput, CorrectionResult } from '../services/correction.service';
import type { ProjectService, Project } from '../services/project.service';
import type { ProjectStudentService, AssignedStudent } from '../services/project-student.service';
import type { RubricService, RubricItem } from '../services/rubric.service';
import type { LegislationService } from '../services/legislation.service';
import type { CycleService } from '../services/cycle.service';
import type { ModuleService } from '../services/module.service';
import { CascadeQueries } from './cascade-queries';

export type SaveState =
  | { status: 'success' }
  | { status: 'blocked'; message: string }
  | { status: 'error'; message: string };

export class CorrectionController extends CascadeQueries {
  constructor(
    private readonly correctionService: CorrectionService,
    private readonly projectService: ProjectService,
    private readonly projectStudentService: ProjectStudentService,
    private readonly rubricService: RubricService,
    legislationService: LegislationService,
    cycleService: CycleService,
    moduleService: ModuleService,
  ) {
    super(legislationService, cycleService, moduleService);
  }

  async loadProjects(moduleId: number | null): Promise<Project[]> {
    if (moduleId === null) return [];
    const result = await this.projectService.list({ moduleId });
    return result.ok ? result.items : [];
  }

  async loadAssignedStudents(projectId: number): Promise<AssignedStudent[]> {
    const result = await this.projectStudentService.listForProject(projectId);
    return result.ok ? result.items : [];
  }

  async loadRubric(moduleId: number, academicYear: string): Promise<{ rubricId: number; items: RubricItem[] } | null> {
    const result = await this.rubricService.getForModule(moduleId, academicYear);
    if (!result.ok) return null;
    return { rubricId: result.item.id, items: result.item.items };
  }

  async loadExistingCorrection(studentId: number, projectId: number): Promise<CorrectionResult | null> {
    const result = await this.correctionService.findExisting(studentId, projectId);
    return result.ok ? result.item : null;
  }

  rawScore(selections: Map<number, number>, items: RubricItem[]): number {
    let sum = 0;
    for (const item of items) {
      const levelId = selections.get(item.id);
      const level = item.levels.find((l) => l.id === levelId);
      if (level) sum += level.score;
    }
    return sum;
  }

  maxScore(items: RubricItem[]): number {
    return items.reduce((sum, item) => sum + Math.max(0, ...item.levels.map((l) => l.score)), 0);
  }

  normalisedScore(raw: number, max: number): number {
    if (max === 0) return 0;
    return Math.round((raw / max) * 10 * 100) / 100;
  }

  async saveForStudents(
    studentIds: number[],
    projectId: number,
    moduleId: number,
    rubricId: number,
    academicYear: string,
    selections: Map<number, number>,
  ): Promise<SaveState> {
    const items: CorrectionItemInput[] = Array.from(selections.entries())
      .map(([rubricItemId, rubricLevelId]) => ({ rubricItemId, rubricLevelId }));

    for (const studentId of studentIds) {
      const result = await this.correctionService.upsert({
        studentId, projectId, moduleId, rubricId, academicYear, items,
      });
      if (!result.ok) {
        if (result.code === 'NO_RUBRIC' || result.code === 'INCOMPLETE_SELECTION') {
          return { status: 'blocked', message: 'Faltan ítems por calificar' };
        }
        return { status: 'error', message: 'No se pudo guardar la corrección' };
      }
    }
    return { status: 'success' };
  }
}
