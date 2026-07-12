import type { CreateModuleData, Module, ModuleService } from '../services/module.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import type { Cycle, CycleService } from '../services/cycle.service';

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 100;

export interface ModuleRow extends Module {
  startYear: number | null;
}

export interface FieldErrors {
  name: boolean;
  weeklyHours: boolean;
  legislation: boolean;
  year: boolean;
  cycle: boolean;
}

export type SaveState =
  | { status: 'success'; item: Module }
  | { status: 'validation-error'; errors: FieldErrors }
  | { status: 'error'; message: string };

export type DeleteState =
  | { status: 'success' }
  | { status: 'blocked'; message: string }
  | { status: 'error'; message: string };

function validateName(name: string): boolean {
  return name.length >= MIN_NAME_LENGTH && name.length <= MAX_NAME_LENGTH;
}

function validateWeeklyHours(hours: number): boolean {
  return Number.isInteger(hours) && hours >= 1 && hours <= 30;
}

export class ModuleController {
  constructor(
    private readonly moduleService: ModuleService,
    private readonly legislationService: LegislationService,
    private readonly cycleService: CycleService,
  ) {}

  async list(): Promise<ModuleRow[]> {
    return this.filterRows('', '', '', '');
  }

  async loadLegislationOptions(): Promise<Legislation[]> {
    const result = await this.legislationService.list();
    return result.ok ? result.items : [];
  }

  // Legislación:año is 1:1 — #26 just echoes the chosen legislation's own
  // start year; it is required for submission but never sent to the backend
  // (Module has no year field of its own).
  async loadYearOptions(legislationId: number | null): Promise<number[]> {
    if (legislationId === null) return [];
    const legislations = await this.loadLegislationOptions();
    const match = legislations.find((l) => l.id === legislationId);
    return match ? [match.startYear] : [];
  }

  // Filtered to cycles that already have a module under the chosen
  // legislation (GET /api/cycles?legislationId=) — accepted limitation: the
  // very first module of a brand new cycle+legislation pairing can't be
  // created from this screen. See boceto-elements.md sketchNumber 27.
  async loadCycleOptions(legislationId: number | null): Promise<Cycle[]> {
    if (legislationId === null) return [];
    const result = await this.cycleService.list({ legislationId });
    return result.ok ? result.items : [];
  }

  async create(
    name: string,
    weeklyHoursRaw: string,
    legislationIdRaw: string,
    yearRaw: string,
    cycleIdRaw: string,
  ): Promise<SaveState> {
    const weeklyHours = Number(weeklyHoursRaw);
    const errors: FieldErrors = {
      name: !validateName(name),
      weeklyHours: !validateWeeklyHours(weeklyHours),
      legislation: legislationIdRaw.trim() === '',
      year: yearRaw.trim() === '',
      cycle: cycleIdRaw.trim() === '',
    };
    if (Object.values(errors).some(Boolean)) {
      return { status: 'validation-error', errors };
    }

    const data: CreateModuleData = {
      name,
      weeklyHours,
      cycleId: Number(cycleIdRaw),
      legislationId: Number(legislationIdRaw),
    };
    const result = await this.moduleService.create(data);
    if (result.ok) return { status: 'success', item: result.item };

    if (result.code === 'DUPLICATE') {
      return { status: 'error', message: `El módulo '${name}' ya existe en ese ciclo y legislación` };
    }
    return { status: 'error', message: 'No se pudo guardar el módulo' };
  }

  async update(id: number, name: string, weeklyHoursRaw: string): Promise<SaveState> {
    const weeklyHours = Number(weeklyHoursRaw);
    const errors: FieldErrors = {
      name: !validateName(name),
      weeklyHours: !validateWeeklyHours(weeklyHours),
      legislation: false,
      year: false,
      cycle: false,
    };
    if (errors.name || errors.weeklyHours) {
      return { status: 'validation-error', errors };
    }

    const result = await this.moduleService.update(id, { name, weeklyHours });
    if (result.ok) return { status: 'success', item: result.item };

    if (result.code === 'DUPLICATE') {
      return { status: 'error', message: `El módulo '${name}' ya existe en ese ciclo y legislación` };
    }
    return { status: 'error', message: 'No se pudo actualizar el módulo' };
  }

  async delete(id: number): Promise<DeleteState> {
    const result = await this.moduleService.delete(id);
    if (result.ok) return { status: 'success' };

    if (result.code === 'HAS_DEPENDANTS') {
      return {
        status: 'blocked',
        message: 'No se puede eliminar: existen proyectos asociados. Elimine los proyectos primero.',
      };
    }
    return { status: 'error', message: 'No se pudo eliminar el módulo' };
  }

  async filterRows(
    nameQuery: string,
    yearQuery: string,
    legislationQuery: string,
    cycleQuery: string,
  ): Promise<ModuleRow[]> {
    const [modulesResult, legislations] = await Promise.all([
      this.moduleService.list(),
      this.loadLegislationOptions(),
    ]);
    const modules = modulesResult.ok ? modulesResult.items : [];
    const yearById = new Map(legislations.map((l) => [l.id, l.startYear]));

    const name = nameQuery.trim().toLowerCase();
    const year = yearQuery.trim();
    const legislation = legislationQuery.trim().toLowerCase();
    const cycle = cycleQuery.trim().toLowerCase();

    return modules
      .map((m): ModuleRow => ({ ...m, startYear: yearById.get(m.legislationId) ?? null }))
      .filter((m) => (name === '' || m.name.toLowerCase().includes(name))
        && (year === '' || (m.startYear !== null && String(m.startYear).includes(year)))
        && (legislation === '' || m.legislationName.toLowerCase().includes(legislation))
        && (cycle === '' || m.cycleName.toLowerCase().includes(cycle)));
  }
}
