import type { RubricService, RubricItem, LevelInput } from '../services/rubric.service';
import type { LegislationService } from '../services/legislation.service';
import type { CycleService } from '../services/cycle.service';
import type { ModuleService } from '../services/module.service';
import { CascadeQueries } from './cascade-queries';

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

export class RubricController extends CascadeQueries {
  constructor(
    private readonly rubricService: RubricService,
    legislationService: LegislationService,
    cycleService: CycleService,
    moduleService: ModuleService,
  ) {
    super(legislationService, cycleService, moduleService);
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

  async addItem(moduleId: number, academicYear: string, description: string, levels: BuilderLevel[], existingItemCount: number): Promise<SaveState> {
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
      // rubric_item has UNIQUE(rubric_id, display_order) — hardcoding 1
      // here would collide with any item already in the rubric.
      displayOrder: existingItemCount + 1,
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
