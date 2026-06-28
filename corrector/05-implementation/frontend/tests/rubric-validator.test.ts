// sketchNumbers: 91, 92, 93, 94, 95, 96, 98
// Client-side rubric constraint validation (builder and item editor)

import { describe, it, expect } from 'bun:test';
import { RubricValidator } from '../src/utils/rubric-validator';

// RubricValidator is a pure utility class with no external dependencies.

interface RubricLevel {
  name: string;
  score: number;
}

interface RubricItem {
  description: string;
  levels: RubricLevel[];
}

describe('Element #96 — RubricValidator: Mal level must always be 0', () => {
  const validator = new RubricValidator();

  it('returns valid when Mal level score is 0', () => {
    const item: RubricItem = {
      description: 'Diseño UI',
      levels: [
        { name: 'Excelente', score: 3.0 },
        { name: 'Bien',      score: 2.0 },
        { name: 'Mal',       score: 0.0 },
      ],
    };
    const result = validator.validateItem(item, 0);
    expect(result.valid).toBe(true);
  });

  it('returns invalid when Mal level score is non-zero', () => {
    const item: RubricItem = {
      description: 'Diseño UI',
      levels: [
        { name: 'Excelente', score: 3.0 },
        { name: 'Bien',      score: 2.0 },
        { name: 'Mal',       score: 1.0 }, // INVALID
      ],
    };
    const result = validator.validateItem(item, 0);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('MAL_NONZERO');
  });

  it('resets Mal score to 0 when fixMal option is used', () => {
    const item: RubricItem = {
      description: 'Test',
      levels: [
        { name: 'Excelente', score: 3.0 },
        { name: 'Mal',       score: 2.0 },
      ],
    };
    const fixed = validator.fixMalLevel(item);
    expect(fixed.levels.find(l => l.name === 'Mal')?.score).toBe(0);
  });
});

describe('Elements #94 #98 — RubricValidator: Excelente sum must not exceed 10', () => {
  const validator = new RubricValidator();

  it('returns valid when adding item keeps Excelente sum at or below 10', () => {
    const item: RubricItem = {
      description: 'Documentación',
      levels: [
        { name: 'Excelente', score: 3.0 },
        { name: 'Bien',      score: 2.0 },
        { name: 'Mal',       score: 0.0 },
      ],
    };
    const currentSum = 7.0; // existing rubric Excelente sum
    const result = validator.validateItem(item, currentSum);
    expect(result.valid).toBe(true); // 7 + 3 = 10 ✅
  });

  it('returns invalid when Excelente sum would exceed 10', () => {
    const item: RubricItem = {
      description: 'Expensive',
      levels: [
        { name: 'Excelente', score: 4.0 }, // 7 + 4 = 11 > 10 ❌
        { name: 'Mal',       score: 0.0 },
      ],
    };
    const result = validator.validateItem(item, 7.0);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('SCORE_LIMIT_EXCEEDED');
  });

  it('returns invalid when a single item Excelente alone exceeds 10', () => {
    const item: RubricItem = {
      description: 'Too much',
      levels: [
        { name: 'Excelente', score: 11.0 }, // > 10 alone
        { name: 'Mal',       score: 0.0 },
      ],
    };
    const result = validator.validateItem(item, 0);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('SCORE_LIMIT_EXCEEDED');
  });

  it('accumulates Excelente sum correctly across multiple items', () => {
    const items: RubricItem[] = [
      { description: 'A', levels: [{ name: 'Excelente', score: 3.0 }, { name: 'Mal', score: 0.0 }] },
      { description: 'B', levels: [{ name: 'Excelente', score: 3.0 }, { name: 'Mal', score: 0.0 }] },
      { description: 'C', levels: [{ name: 'Excelente', score: 4.0 }, { name: 'Mal', score: 0.0 }] },
    ];
    const total = validator.calculateExcelenteSum(items);
    expect(total).toBe(10.0);
  });
});

describe('Element #91 — RubricValidator: maximum 5 levels per item', () => {
  const validator = new RubricValidator();

  it('returns valid for an item with exactly 5 levels', () => {
    const item: RubricItem = {
      description: 'Five levels',
      levels: [
        { name: 'Excelente', score: 2.0 },
        { name: 'Muy bien',  score: 1.5 },
        { name: 'Bien',      score: 1.0 },
        { name: 'Regular',   score: 0.5 },
        { name: 'Mal',       score: 0.0 },
      ],
    };
    const result = validator.validateItem(item, 0);
    expect(result.valid).toBe(true);
  });

  it('returns invalid for an item with 6 levels', () => {
    const item: RubricItem = {
      description: 'Six levels',
      levels: [
        { name: 'Excelente', score: 2.0 },
        { name: 'Muy bien',  score: 1.5 },
        { name: 'Bien',      score: 1.0 },
        { name: 'Regular',   score: 0.5 },
        { name: 'Mal',       score: 0.0 },
        { name: 'Extra',     score: 0.0 },
      ],
    };
    const result = validator.validateItem(item, 0);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('TOO_MANY_LEVELS');
  });
});

describe('Element #93 — RubricValidator: item description is required', () => {
  const validator = new RubricValidator();

  it('returns invalid when description is empty', () => {
    const item: RubricItem = {
      description: '',
      levels: [
        { name: 'Excelente', score: 3.0 },
        { name: 'Mal',       score: 0.0 },
      ],
    };
    const result = validator.validateItem(item, 0);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('DESCRIPTION_REQUIRED');
  });

  it('returns valid when description is provided', () => {
    const item: RubricItem = {
      description: 'Diseño de la interfaz',
      levels: [
        { name: 'Excelente', score: 3.0 },
        { name: 'Mal',       score: 0.0 },
      ],
    };
    const result = validator.validateItem(item, 0);
    expect(result.valid).toBe(true);
  });
});

describe('Element #95 — RubricValidator: Bien score validation', () => {
  const validator = new RubricValidator();

  it('returns valid when Bien score is non-negative', () => {
    const item: RubricItem = {
      description: 'Test',
      levels: [
        { name: 'Excelente', score: 3.0 },
        { name: 'Bien',      score: 2.0 },
        { name: 'Mal',       score: 0.0 },
      ],
    };
    expect(validator.validateItem(item, 0).valid).toBe(true);
  });

  it('returns invalid when Bien score is negative', () => {
    const item: RubricItem = {
      description: 'Test',
      levels: [
        { name: 'Excelente', score: 3.0 },
        { name: 'Bien',      score: -1.0 }, // INVALID
        { name: 'Mal',       score: 0.0 },
      ],
    };
    const result = validator.validateItem(item, 0);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('NEGATIVE_SCORE');
  });
});
