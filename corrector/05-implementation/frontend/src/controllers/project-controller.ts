import type { Project, ProjectService } from '../services/project.service';
import type { LegislationService } from '../services/legislation.service';
import type { CycleService } from '../services/cycle.service';
import type { ModuleService } from '../services/module.service';
import { NameCascadeControllerBase } from './name-cascade-controller-base';
import type { EntityServiceResult, DeleteServiceResult } from './name-cascade-controller-base';
import type { NameCascadeRow } from './name-cascade-crud-form';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

export type ProjectRow = NameCascadeRow<Project>;

// A project has no direct start_year field — its year lives in
// academic_year ("YYYY-YYYY"). #62/#68 only offer a single start year, so
// creation derives the range from it (same convention as the boceto's
// "Año de inicio" sample data: an academic_year always spans year -> year+1).
function toAcademicYear(startYear: number): string {
  return `${startYear}-${startYear + 1}`;
}

function parseStartYear(academicYear: string): number | null {
  const year = Number(academicYear.slice(0, 4));
  return Number.isNaN(year) ? null : year;
}

export class ProjectController extends NameCascadeControllerBase<Project> {
  constructor(
    private readonly projectService: ProjectService,
    legislationService: LegislationService,
    cycleService: CycleService,
    moduleService: ModuleService,
  ) {
    super(legislationService, cycleService, moduleService);
  }

  protected _validateName(name: string): boolean {
    return name.length >= MIN_NAME_LENGTH && name.length <= MAX_NAME_LENGTH;
  }

  protected async _createEntity(name: string, yearRaw: string, _cycleIdRaw: string, moduleIdRaw: string): Promise<EntityServiceResult<Project>> {
    return this.projectService.create({ name, academicYear: toAcademicYear(Number(yearRaw)), moduleId: Number(moduleIdRaw) });
  }

  protected _createErrorMessage(): string {
    return 'No se pudo guardar el proyecto';
  }

  protected async _updateEntity(id: number, name: string): Promise<EntityServiceResult<Project>> {
    return this.projectService.update(id, { name });
  }

  protected _updateErrorMessage(): string {
    return 'No se pudo actualizar el proyecto';
  }

  protected async _deleteEntity(id: number): Promise<DeleteServiceResult> {
    return this.projectService.delete(id);
  }

  protected _deleteBlockedMessage(): string {
    return 'No se puede eliminar: el proyecto tiene alumnos asignados.';
  }

  protected _deleteErrorMessage(): string {
    return 'No se pudo eliminar el proyecto';
  }

  async filterRows(
    nameQuery: string,
    yearQuery: string,
    legislationQuery: string,
    cycleQuery: string,
    moduleQuery: string,
  ): Promise<ProjectRow[]> {
    const [projectsResult, modulesResult] = await Promise.all([
      this.projectService.list(),
      this.moduleService.list(),
    ]);
    const projects = projectsResult.ok ? projectsResult.items : [];
    const modules = modulesResult.ok ? modulesResult.items : [];
    const moduleById = new Map(modules.map((m) => [m.id, m]));

    const name = nameQuery.trim().toLowerCase();
    const year = yearQuery.trim() === '' ? null : Number(yearQuery);
    const legislationId = legislationQuery.trim() === '' ? null : Number(legislationQuery);
    const cycleId = cycleQuery.trim() === '' ? null : Number(cycleQuery);
    const cycleName = cycleId === null ? null : modules.find((m) => m.cycleId === cycleId)?.cycleName ?? null;
    const moduleId = moduleQuery.trim() === '' ? null : Number(moduleQuery);

    return projects
      .map((project): ProjectRow => {
        const mod = moduleById.get(project.moduleId);
        return {
          ...project,
          legislationName: mod?.legislationName ?? null,
          startYear: parseStartYear(project.academicYear),
        };
      })
      .filter((row) => (name === '' || row.name.toLowerCase().includes(name))
        && (year === null || row.startYear === year)
        && (legislationId === null || moduleById.get(row.moduleId)?.legislationId === legislationId)
        && (cycleName === null || row.cycleName === cycleName)
        && (moduleId === null || row.moduleId === moduleId));
  }
}
