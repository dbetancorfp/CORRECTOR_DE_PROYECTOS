import type { Legislation, LegislationService } from '../services/legislation.service';

const NAME_PATTERN = /^[A-Z]{2,10}$/;
const MIN_YEAR = 1900;
const MAX_YEAR = 2099;

export interface FieldErrors {
  name: boolean;
  startYear: boolean;
}

export type SaveState =
  | { status: 'success'; item: Legislation }
  | { status: 'validation-error'; errors: FieldErrors }
  | { status: 'error'; message: string };

export type DeleteState =
  | { status: 'success' }
  | { status: 'blocked'; message: string }
  | { status: 'error'; message: string };

function validate(name: string, startYear: number): FieldErrors {
  return {
    name: !NAME_PATTERN.test(name),
    startYear: !Number.isInteger(startYear) || startYear < MIN_YEAR || startYear > MAX_YEAR,
  };
}

export class LegislationController {
  constructor(private readonly service: LegislationService) {}

  async list(): Promise<Legislation[]> {
    const result = await this.service.list();
    return result.ok ? result.items : [];
  }

  async create(name: string, startYear: number): Promise<SaveState> {
    const errors = validate(name, startYear);
    if (errors.name || errors.startYear) {
      return { status: 'validation-error', errors };
    }

    const result = await this.service.create(name, startYear);
    if (result.ok) return { status: 'success', item: result.item };

    if (result.code === 'DUPLICATE') {
      return { status: 'error', message: `La legislación '${name}' ya existe` };
    }
    return { status: 'error', message: 'No se pudo guardar la legislación' };
  }

  async update(id: number, name: string, startYear: number): Promise<SaveState> {
    const errors = validate(name, startYear);
    if (errors.name || errors.startYear) {
      return { status: 'validation-error', errors };
    }

    const result = await this.service.update(id, { name, startYear });
    if (result.ok) return { status: 'success', item: result.item };

    if (result.code === 'DUPLICATE') {
      return { status: 'error', message: `La legislación '${name}' ya existe` };
    }
    return { status: 'error', message: 'No se pudo actualizar la legislación' };
  }

  async delete(id: number): Promise<DeleteState> {
    const result = await this.service.delete(id);
    if (result.ok) return { status: 'success' };

    if (result.code === 'HAS_DEPENDANTS') {
      return {
        status: 'blocked',
        message: 'No se puede eliminar: existen módulos asociados. Elimine los módulos primero.',
      };
    }
    return { status: 'error', message: 'No se pudo eliminar la legislación' };
  }

  filterRows(rows: Legislation[], yearQuery: string, nameQuery: string): Legislation[] {
    const year = yearQuery.trim();
    const name = nameQuery.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesYear = year === '' || String(row.startYear).includes(year);
      const matchesName = name === '' || row.name.toLowerCase().includes(name);
      return matchesYear && matchesName;
    });
  }
}
