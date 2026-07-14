import type {
  RubricRepository,
  RubricFull,
  RubricItemFull,
  AddRubricItemData,
  RubricItemInput,
} from '../rubric.repository';
import type { Store } from './store';
import { nextId } from './store';

export class InMemoryRubricRepository implements RubricRepository {
  constructor(private readonly store: Store) {}

  async findByModule(moduleId: number, academicYear: string): Promise<RubricFull | null> {
    const rubric = this.store.rubrics.find(
      (r) => r.moduleId === moduleId && r.academicYear === academicYear,
    );
    if (!rubric) return null;
    const items = this.store.rubricItems.filter((i) => i.rubricId === rubric.id);
    return { ...rubric, items };
  }

  async addItem(moduleId: number, item: AddRubricItemData): Promise<RubricItemFull> {
    let rubric = this.store.rubrics.find(
      (r) => r.moduleId === moduleId && r.academicYear === item.academicYear,
    );
    if (!rubric) {
      rubric = {
        id: nextId(this.store, 'rubric'),
        moduleId,
        academicYear: item.academicYear,
        frozen: false,
        items: [],
      };
      this.store.rubrics.push(rubric);
    }
    const levels = item.levels.map((l, i) => ({
      id: nextId(this.store, 'rubricLevel'),
      name: l.name,
      score: l.score,
      displayOrder: l.displayOrder ?? i + 1,
    }));
    const newItem: RubricItemFull = {
      id: nextId(this.store, 'rubricItem'),
      rubricId: rubric.id,
      description: item.description,
      displayOrder: item.displayOrder,
      levels,
    };
    this.store.rubricItems.push(newItem);
    return newItem;
  }

  async updateItem(itemId: number, data: Partial<AddRubricItemData>): Promise<RubricItemFull> {
    const item = this.store.rubricItems.find((i) => i.id === itemId);
    if (!item) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    if (data.description !== undefined) item.description = data.description;
    if (data.levels !== undefined) {
      item.levels = data.levels.map((l, i) => ({
        id: nextId(this.store, 'rubricLevel'),
        name: l.name,
        score: l.score,
        displayOrder: l.displayOrder ?? i + 1,
      }));
    }
    return item;
  }

  async deleteItem(itemId: number): Promise<void> {
    const idx = this.store.rubricItems.findIndex((i) => i.id === itemId);
    if (idx >= 0) this.store.rubricItems.splice(idx, 1);
  }

  async hasCorrectionItems(itemId: number): Promise<boolean> {
    return this.store.corrections.some((c) => c.items.some((i) => i.rubricItemId === itemId));
  }

  async isFrozen(id: number, academicYear?: string): Promise<boolean> {
    if (academicYear !== undefined) {
      return this.store.rubrics.some(
        (r) => r.moduleId === id && r.academicYear === academicYear && r.frozen,
      );
    }
    const item = this.store.rubricItems.find((i) => i.id === id);
    if (!item) return false;
    const rubric = this.store.rubrics.find((r) => r.id === item.rubricId);
    return rubric?.frozen ?? false;
  }

  async getExcelenteSumExcluding(moduleId: number, excludeItemId?: number): Promise<number> {
    const rubrics = this.store.rubrics.filter((r) => r.moduleId === moduleId);
    let sum = 0;
    for (const r of rubrics) {
      const items = this.store.rubricItems.filter(
        (i) => i.rubricId === r.id && i.id !== excludeItemId,
      );
      for (const item of items) {
        const excelente = item.levels.find((l) => l.name === 'Excelente');
        if (excelente) sum += excelente.score;
      }
    }
    return sum;
  }

  async replaceAll(
    moduleId: number,
    academicYear: string,
    items: RubricItemInput[],
  ): Promise<void> {
    let rubric = this.store.rubrics.find(
      (r) => r.moduleId === moduleId && r.academicYear === academicYear,
    );
    if (!rubric) {
      rubric = {
        id: nextId(this.store, 'rubric'),
        moduleId,
        academicYear,
        frozen: false,
        items: [],
      };
      this.store.rubrics.push(rubric);
    }
    this.store.rubricItems = this.store.rubricItems.filter((i) => i.rubricId !== rubric!.id);
    for (const item of items) {
      const levels = item.levels.map((l, i) => ({
        id: nextId(this.store, 'rubricLevel'),
        name: l.name,
        score: l.score,
        displayOrder: l.displayOrder ?? i + 1,
      }));
      this.store.rubricItems.push({
        id: nextId(this.store, 'rubricItem'),
        rubricId: rubric.id,
        description: item.description,
        displayOrder: item.displayOrder,
        levels,
      });
    }
  }
}
