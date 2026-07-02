import type {
  RubricRepository,
  RubricFull,
  RubricItemFull,
  AddRubricItemData,
} from '../repositories/rubric.repository';

const MAX_LEVELS_PER_ITEM = 5;
const MAX_EXCELENTE_SUM = 10;

class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

export class RubricService {
  constructor(private readonly repo: RubricRepository) {}

  async getRubricForModule(moduleId: number, academicYear: string): Promise<RubricFull> {
    const rubric = await this.repo.findByModule(moduleId, academicYear);
    if (!rubric) {
      throw new AppError('Rubric not found for this module and academic year', 'NOT_FOUND');
    }
    return rubric;
  }

  async addItem(moduleId: number, item: AddRubricItemData): Promise<RubricItemFull> {
    const frozen = await this.repo.isFrozen(moduleId, item.academicYear);
    if (frozen) {
      throw new AppError('Cannot modify a frozen rubric', 'RUBRIC_FROZEN');
    }

    if (item.levels.length > MAX_LEVELS_PER_ITEM) {
      throw new AppError(`Maximum ${MAX_LEVELS_PER_ITEM} levels per item`, 'TOO_MANY_LEVELS');
    }

    const malLevel = item.levels.find((l) => l.name === 'Mal');
    if (malLevel && malLevel.score !== 0) {
      throw new AppError('Mal level must always have score 0', 'MAL_NONZERO');
    }

    const excelentLevel = item.levels.find((l) => l.name === 'Excelente');
    if (excelentLevel) {
      const currentSum = await this.repo.getExcelenteSumExcluding(moduleId);
      if (currentSum + excelentLevel.score > MAX_EXCELENTE_SUM) {
        throw new AppError('Adding this item would exceed the maximum Excelente sum of 10', 'SCORE_LIMIT_EXCEEDED');
      }
    }

    return this.repo.addItem(moduleId, item);
  }

  async updateItem(itemId: number, data: Partial<AddRubricItemData>): Promise<RubricItemFull> {
    const excelentLevel = data.levels?.find((l) => l.name === 'Excelente');
    if (excelentLevel) {
      const currentSum = await this.repo.getExcelenteSumExcluding(itemId, itemId);
      if (currentSum + excelentLevel.score > MAX_EXCELENTE_SUM) {
        throw new AppError('Updating this item would exceed the maximum Excelente sum of 10', 'SCORE_LIMIT_EXCEEDED');
      }
    }

    return this.repo.updateItem(itemId, data);
  }

  async deleteItem(itemId: number): Promise<void> {
    const frozen = await this.repo.isFrozen(itemId);
    if (frozen) {
      throw new AppError('Cannot modify a frozen rubric', 'RUBRIC_FROZEN');
    }

    await this.repo.deleteItem(itemId);
  }
}
