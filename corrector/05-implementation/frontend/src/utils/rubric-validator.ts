export interface RubricLevel {
  name: string;
  score: number;
}

export interface RubricItem {
  description: string;
  levels: RubricLevel[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

const MAX_LEVELS = 5;
const MAX_EXCELENTE_SUM = 10;

export class RubricValidator {
  validateItem(item: RubricItem, currentExcelenteSum: number): ValidationResult {
    const errors: string[] = [];

    if (!item.description || item.description.trim().length === 0) {
      errors.push('DESCRIPTION_REQUIRED');
    }

    if (item.levels.length > MAX_LEVELS) {
      errors.push('TOO_MANY_LEVELS');
    }

    const malLevel = item.levels.find((l) => l.name === 'Mal');
    if (malLevel && malLevel.score !== 0) {
      errors.push('MAL_NONZERO');
    }

    const negativeLevel = item.levels.find((l) => l.name !== 'Mal' && l.score < 0);
    if (negativeLevel) {
      errors.push('NEGATIVE_SCORE');
    }

    const excelentLevel = item.levels.find((l) => l.name === 'Excelente');
    if (excelentLevel && currentExcelenteSum + excelentLevel.score > MAX_EXCELENTE_SUM) {
      errors.push('SCORE_LIMIT_EXCEEDED');
    }

    return { valid: errors.length === 0, errors };
  }

  fixMalLevel(item: RubricItem): RubricItem {
    return {
      ...item,
      levels: item.levels.map((l) => (l.name === 'Mal' ? { ...l, score: 0 } : l)),
    };
  }

  calculateExcelenteSum(items: RubricItem[]): number {
    return items.reduce((sum, item) => {
      const excelente = item.levels.find((l) => l.name === 'Excelente');
      return sum + (excelente?.score ?? 0);
    }, 0);
  }
}
