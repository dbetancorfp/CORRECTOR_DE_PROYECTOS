import type { Cycle, CycleService } from '../services/cycle.service';
import type { Legislation, LegislationService } from '../services/legislation.service';

const MIN_NAME_LENGTH = 3;
const MAX_NAME_LENGTH = 100;

export interface FieldErrors {
  name: boolean;
  year: boolean;
  legislation: boolean;
}

export type SaveState =
  | { status: 'success'; item: Cycle }
  | { status: 'validation-error'; errors: FieldErrors }
  | { status: 'error'; message: string };

export type DeleteState =
  | { status: 'success' }
  | { status: 'blocked'; message: string }
  | { status: 'error'; message: string };

function validateName(name: string): boolean {
  return name.length >= MIN_NAME_LENGTH && name.length <= MAX_NAME_LENGTH;
}

export class CycleController {
  constructor(
    private readonly cycleService: CycleService,
    private readonly legislationService: LegislationService,
  ) {}

  async list(): Promise<Cycle[]> {
    const result = await this.cycleService.list();
    return result.ok ? result.items : [];
  }

  async loadYearOptions(): Promise<number[]> {
    const legislations = await this._legislations();
    const years = new Set(legislations.map((l) => l.startYear));
    return Array.from(years).sort((a, b) => a - b);
  }

  async loadLegislationOptions(year: number | null): Promise<Legislation[]> {
    if (year === null) return [];
    const legislations = await this._legislations();
    return legislations.filter((l) => l.startYear === year);
  }

  // #14/#15 are navigation aids only — required for submission, never persisted
  // (see functional-spec.json sketchNumbers 14/15).
  async create(name: string, yearSelected: string, legislationSelected: string): Promise<SaveState> {
    const errors: FieldErrors = {
      name: !validateName(name),
      year: yearSelected.trim() === '',
      legislation: legislationSelected.trim() === '',
    };
    if (errors.name || errors.year || errors.legislation) {
      return { status: 'validation-error', errors };
    }

    const result = await this.cycleService.create(name);
    if (result.ok) return { status: 'success', item: result.item };

    if (result.code === 'DUPLICATE') {
      return { status: 'error', message: `El ciclo '${name}' ya existe` };
    }
    return { status: 'error', message: 'No se pudo guardar el ciclo' };
  }

  async update(id: number, name: string): Promise<SaveState> {
    const errors: FieldErrors = { name: !validateName(name), year: false, legislation: false };
    if (errors.name) {
      return { status: 'validation-error', errors };
    }

    const result = await this.cycleService.update(id, name);
    if (result.ok) return { status: 'success', item: result.item };

    if (result.code === 'DUPLICATE') {
      return { status: 'error', message: `El ciclo '${name}' ya existe` };
    }
    return { status: 'error', message: 'No se pudo actualizar el ciclo' };
  }

  async delete(id: number): Promise<DeleteState> {
    const result = await this.cycleService.delete(id);
    if (result.ok) return { status: 'success' };

    if (result.code === 'HAS_DEPENDANTS') {
      return {
        status: 'blocked',
        message: 'No se puede eliminar: existen módulos asociados. Elimine los módulos primero.',
      };
    }
    return { status: 'error', message: 'No se pudo eliminar el ciclo' };
  }

  // #17 (año) and #18 (legislación) filter via a JOIN through modules → legislación
  // that only the backend can perform (Cycle carries no legislation/year of its
  // own). Free-text #17/#18 are resolved to candidate legislation ids locally,
  // then each candidate is queried against /api/cycles and the results merged —
  // there is no "OR of ids" query param on the endpoint.
  async filterRows(nameQuery: string, yearQuery: string, legislationQuery: string): Promise<Cycle[]> {
    const name = nameQuery.trim();
    const year = yearQuery.trim();
    const legislation = legislationQuery.trim();

    if (year === '' && legislation === '') {
      const result = await this.cycleService.list(name === '' ? {} : { name });
      return result.ok ? result.items : [];
    }

    const legislations = await this._legislations();
    const candidateIds = legislations
      .filter((l) => (year === '' || String(l.startYear).includes(year))
        && (legislation === '' || l.name.toLowerCase().includes(legislation.toLowerCase())))
      .map((l) => l.id);

    if (candidateIds.length === 0) return [];

    const resultsPerId = await Promise.all(
      candidateIds.map((legislationId) => this.cycleService.list({ legislationId })),
    );
    const merged = new Map<number, Cycle>();
    for (const result of resultsPerId) {
      if (result.ok) {
        for (const cycle of result.items) merged.set(cycle.id, cycle);
      }
    }

    let cycles = Array.from(merged.values());
    if (name !== '') {
      const q = name.toLowerCase();
      cycles = cycles.filter((c) => c.name.toLowerCase().includes(q));
    }
    return cycles;
  }

  private async _legislations(): Promise<Legislation[]> {
    const result = await this.legislationService.list();
    return result.ok ? result.items : [];
  }
}
