import type { RubricService, RubricItem, LevelInput } from '../services/rubric.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import type { Module, ModuleService } from '../services/module.service';

// Canonical level order, worst to best is Mal < Regular < Bien < Muy bien <
// Excelente. The builder starts with the 3 defaults (Excelente, Bien, Mal);
// "Nuevo nivel" inserts the next missing canonical name at its correct
// position until all 5 are present.
export const DEFAULT_LEVEL_NAMES = ['Excelente', 'Bien', 'Mal'];
const CANONICAL_ORDER = ['Excelente', 'Muy bien', 'Bien', 'Regular', 'Mal'];
const MAX_LEVEL_COUNT = 5;

export interface BuilderLevel {
  name: string;
  score: number;
}

export type SaveState =
  | { status: 'success'; item: RubricItem }
  | { status: 'validation-error'; message: string }
  | { status: 'blocked'; message: string }
  | { status: 'error'; message: string };

export type DeleteState =
  | { status: 'success' }
  | { status: 'blocked'; message: string }
  | { status: 'error'; message: string };

export type UploadState =
  | { status: 'success' }
  | { status: 'requires-confirmation'; message: string }
  | { status: 'error'; message: string };

export function nextBuilderLevels(current: BuilderLevel[]): BuilderLevel[] {
  const currentNames = new Set(current.map((l) => l.name));
  const missing = CANONICAL_ORDER.find((name) => !currentNames.has(name));
  if (!missing) return current;

  const insertAt = CANONICAL_ORDER.indexOf(missing);
  const next = [...current];
  next.splice(insertAt, 0, { name: missing, score: 0 });
  return next;
}

function toLevelInputs(levels: BuilderLevel[]): LevelInput[] {
  return levels.map((level, i) => ({
    name: level.name,
    score: level.name === 'Mal' ? 0 : level.score,
    displayOrder: i + 1,
  }));
}

export class RubricController {
  constructor(
    private readonly rubricService: RubricService,
    private readonly legislationService: LegislationService,
    private readonly cycleService: CycleService,
    private readonly moduleService: ModuleService,
  ) {}

  async loadYearOptions(): Promise<number[]> {
    const result = await this.legislationService.list();
    if (!result.ok) return [];
    return Array.from(new Set(result.items.map((l) => l.startYear))).sort((a, b) => a - b);
  }

  async loadLegislationOptions(year: number | null): Promise<Legislation[]> {
    if (year === null) return [];
    const result = await this.legislationService.list();
    if (!result.ok) return [];
    return result.items.filter((l) => l.startYear === year);
  }

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

  async loadRubric(moduleId: number, academicYear: string): Promise<RubricItem[]> {
    const result = await this.rubricService.getForModule(moduleId, academicYear);
    return result.ok ? result.item.items : [];
  }

  filterItems(items: RubricItem[], query: string): RubricItem[] {
    const q = query.trim().toLowerCase();
    if (q === '') return items;
    return items.filter((item) => item.description.toLowerCase().includes(q));
  }

  async addItem(moduleId: number, academicYear: string, description: string, levels: BuilderLevel[]): Promise<SaveState> {
    if (description.trim() === '') {
      return { status: 'validation-error', message: 'El nombre del ítem es obligatorio' };
    }
    const excelente = levels.find((l) => l.name === 'Excelente');
    const bien = levels.find((l) => l.name === 'Bien');
    if (excelente && bien && bien.score > excelente.score) {
      return { status: 'validation-error', message: 'El valor de Bien no puede ser mayor que Excelente' };
    }

    const result = await this.rubricService.addItem(moduleId, {
      academicYear,
      description: description.trim(),
      displayOrder: 1,
      levels: toLevelInputs(levels),
    });
    if (result.ok) return { status: 'success', item: result.item };

    if (result.code === 'SCORE_LIMIT_EXCEEDED') {
      return { status: 'blocked', message: 'La suma de los valores Excelente superaría el máximo de 10 puntos del módulo' };
    }
    if (result.code === 'RUBRIC_FROZEN') {
      return { status: 'blocked', message: 'No se puede modificar: la rúbrica está congelada (tiene correcciones)' };
    }
    return { status: 'error', message: 'No se pudo guardar el ítem' };
  }

  async updateItem(itemId: number, description: string, levels: BuilderLevel[]): Promise<SaveState> {
    if (description.trim() === '') {
      return { status: 'validation-error', message: 'El nombre del ítem es obligatorio' };
    }

    const result = await this.rubricService.updateItem(itemId, {
      description: description.trim(),
      levels: toLevelInputs(levels),
    });
    if (result.ok) return { status: 'success', item: result.item };

    if (result.code === 'SCORE_LIMIT_EXCEEDED') {
      return { status: 'blocked', message: 'La suma de los valores Excelente superaría el máximo de 10 puntos del módulo' };
    }
    if (result.code === 'RUBRIC_FROZEN') {
      return { status: 'blocked', message: 'No se puede modificar: la rúbrica está congelada (tiene correcciones)' };
    }
    return { status: 'error', message: 'No se pudo actualizar el ítem' };
  }

  async deleteItem(itemId: number): Promise<DeleteState> {
    const result = await this.rubricService.deleteItem(itemId);
    if (result.ok) return { status: 'success' };

    if (result.code === 'RUBRIC_FROZEN') {
      return { status: 'blocked', message: 'No se puede eliminar: la rúbrica está congelada (tiene correcciones)' };
    }
    return { status: 'error', message: 'No se pudo eliminar el ítem' };
  }

  async upload(moduleId: number, academicYear: string, file: File, confirm: boolean): Promise<UploadState> {
    const result = await this.rubricService.upload(moduleId, academicYear, file, confirm);
    if (result.ok) return { status: 'success' };

    if (result.code === 'REQUIRES_CONFIRMATION') {
      return { status: 'requires-confirmation', message: 'Este módulo ya tiene una rúbrica. ¿Quieres reemplazarla por completo?' };
    }
    if (result.code === 'UNSUPPORTED_FORMAT') {
      return { status: 'error', message: 'Formato de fichero no soportado' };
    }
    return { status: 'error', message: 'No se pudo subir la rúbrica' };
  }
}

export { MAX_LEVEL_COUNT };
