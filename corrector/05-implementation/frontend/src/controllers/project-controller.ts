import type { Project, ProjectService } from '../services/project.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import type { Module, ModuleService } from '../services/module.service';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

export interface ProjectRow extends Project {
  legislationName: string | null;
  startYear: number | null;
}

export interface FieldErrors {
  name: boolean;
  year: boolean;
  legislation: boolean;
  cycle: boolean;
  module: boolean;
}

export type SaveState =
  | { status: 'success'; item: Project }
  | { status: 'validation-error'; errors: FieldErrors }
  | { status: 'error'; message: string };

export type DeleteState =
  | { status: 'success' }
  | { status: 'blocked'; message: string }
  | { status: 'error'; message: string };

function validateName(name: string): boolean {
  return name.length >= MIN_NAME_LENGTH && name.length <= MAX_NAME_LENGTH;
}

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

export class ProjectController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly legislationService: LegislationService,
    private readonly cycleService: CycleService,
    private readonly moduleService: ModuleService,
  ) {}

  async list(): Promise<ProjectRow[]> {
    return this.filterRows('', '', '', '', '');
  }

  async loadLegislations(): Promise<Legislation[]> {
    const result = await this.legislationService.list();
    return result.ok ? result.items : [];
  }

  async loadYearOptions(): Promise<number[]> {
    const legislations = await this.loadLegislations();
    return Array.from(new Set(legislations.map((l) => l.startYear))).sort((a, b) => a - b);
  }

  async loadLegislationOptions(year: number | null): Promise<Legislation[]> {
    if (year === null) return [];
    const legislations = await this.loadLegislations();
    return legislations.filter((l) => l.startYear === year);
  }

  // Same accepted bootstrap limitation as Módulos #27 / Profesorado #39 /
  // Alumnos #51: only cycles that already have a module under the chosen
  // legislation show up.
  async loadCycleOptions(legislationId: number | null): Promise<Cycle[]> {
    if (legislationId === null) return [];
    const result = await this.cycleService.list({ legislationId });
    return result.ok ? result.items : [];
  }

  async loadModuleOptions(cycleId: number | null): Promise<Module[]> {
    if (cycleId === null) return [];
    const result = await this.moduleService.list();
    if (!result.ok) return [];
    return result.items.filter((m) => m.cycleId === cycleId);
  }

  async create(
    name: string,
    yearRaw: string,
    legislationIdRaw: string,
    cycleIdRaw: string,
    moduleIdRaw: string,
  ): Promise<SaveState> {
    const errors: FieldErrors = {
      name: !validateName(name),
      year: yearRaw.trim() === '',
      legislation: legislationIdRaw.trim() === '',
      cycle: cycleIdRaw.trim() === '',
      module: moduleIdRaw.trim() === '',
    };
    if (Object.values(errors).some(Boolean)) {
      return { status: 'validation-error', errors };
    }

    const result = await this.projectService.create({
      name,
      academicYear: toAcademicYear(Number(yearRaw)),
      moduleId: Number(moduleIdRaw),
    });
    if (result.ok) return { status: 'success', item: result.item };
    return { status: 'error', message: 'No se pudo guardar el proyecto' };
  }

  async update(id: number, name: string): Promise<SaveState> {
    const errors: FieldErrors = { name: !validateName(name), year: false, legislation: false, cycle: false, module: false };
    if (errors.name) {
      return { status: 'validation-error', errors };
    }

    const result = await this.projectService.update(id, { name });
    if (result.ok) return { status: 'success', item: result.item };
    return { status: 'error', message: 'No se pudo actualizar el proyecto' };
  }

  async delete(id: number): Promise<DeleteState> {
    const result = await this.projectService.delete(id);
    if (result.ok) return { status: 'success' };

    if (result.code === 'HAS_DEPENDANTS') {
      return {
        status: 'blocked',
        message: 'No se puede eliminar: el proyecto tiene alumnos asignados.',
      };
    }
    return { status: 'error', message: 'No se pudo eliminar el proyecto' };
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
