// sketchNumbers: 112, 113
// Real-time score display in the correction screen

import { describe, it, expect } from 'bun:test';
import { ScoreCalculator } from '../src/utils/score-calculator';

// ScoreCalculator is a pure utility class with no dependencies (DIP satisfied — no injection needed).

describe('Element #112 — ScoreCalculator: calculateRaw (puntos brutos)', () => {
  const calculator = new ScoreCalculator();

  it('returns sum of all selected level scores', () => {
    const selections = [
      { itemId: 1, selectedScore: 3.0 },
      { itemId: 2, selectedScore: 2.0 },
      { itemId: 3, selectedScore: 0.0 }, // Mal level
    ];
    expect(calculator.calculateRaw(selections)).toBe(5.0);
  });

  it('returns 0 when selections array is empty', () => {
    expect(calculator.calculateRaw([])).toBe(0);
  });

  it('returns 0 when all selected scores are 0 (all Mal)', () => {
    const selections = [
      { itemId: 1, selectedScore: 0.0 },
      { itemId: 2, selectedScore: 0.0 },
    ];
    expect(calculator.calculateRaw(selections)).toBe(0);
  });

  it('handles decimal scores correctly', () => {
    const selections = [
      { itemId: 1, selectedScore: 2.5 },
      { itemId: 2, selectedScore: 1.75 },
    ];
    expect(calculator.calculateRaw(selections)).toBeCloseTo(4.25, 2);
  });

  it('updates in real time on each selection change (pure function, no side effects)', () => {
    const first = calculator.calculateRaw([{ itemId: 1, selectedScore: 3.0 }]);
    const second = calculator.calculateRaw([{ itemId: 1, selectedScore: 5.0 }]);
    expect(first).toBe(3.0);
    expect(second).toBe(5.0);
  });
});

describe('Element #113 — ScoreCalculator: calculateNormalised (nota normalizada)', () => {
  const calculator = new ScoreCalculator();

  it('applies formula (obtained / max) × 10 rounded to 2 decimal places', () => {
    expect(calculator.calculateNormalised(7.5, 10.0)).toBe(7.5);
  });

  it('rounds correctly to 2 decimal places', () => {
    // 7/9 × 10 = 7.7777... → 7.78
    expect(calculator.calculateNormalised(7.0, 9.0)).toBe(7.78);
  });

  it('returns 10.00 when obtained equals max (perfect score)', () => {
    expect(calculator.calculateNormalised(10.0, 10.0)).toBe(10.0);
  });

  it('returns 0 when obtained is 0 (all Mal selected)', () => {
    expect(calculator.calculateNormalised(0, 10.0)).toBe(0);
  });

  it('never returns value greater than 10', () => {
    const result = calculator.calculateNormalised(10.0, 10.0);
    expect(result).toBeLessThanOrEqual(10);
  });

  it('returns 0 and does not throw when max is 0 (empty rubric edge case)', () => {
    expect(() => calculator.calculateNormalised(0, 0)).not.toThrow();
    expect(calculator.calculateNormalised(0, 0)).toBe(0);
  });

  it('updates in real time — each call is independent (pure function)', () => {
    const r1 = calculator.calculateNormalised(5.0, 10.0); // 5.00
    const r2 = calculator.calculateNormalised(8.0, 10.0); // 8.00
    expect(r1).toBe(5.0);
    expect(r2).toBe(8.0);
  });
});

describe('Elements #112 #113 — ScoreCalculator: end-to-end calculation from rubric selections', () => {
  const calculator = new ScoreCalculator();

  it('computes raw and normalised from a full rubric scenario', () => {
    const rubricMaxScores = [
      { itemId: 1, excelente: 3.0 },
      { itemId: 2, excelente: 4.0 },
      { itemId: 3, excelente: 3.0 },
    ];
    const selections = [
      { itemId: 1, selectedScore: 3.0 }, // Excelente
      { itemId: 2, selectedScore: 2.0 }, // Bien
      { itemId: 3, selectedScore: 0.0 }, // Mal
    ];
    const max = rubricMaxScores.reduce((s, r) => s + r.excelente, 0); // 10
    const raw = calculator.calculateRaw(selections); // 5
    const normalised = calculator.calculateNormalised(raw, max); // 5.00
    expect(raw).toBe(5.0);
    expect(normalised).toBe(5.0);
  });

  it('returns normalised score with 2 decimal places for an 8.5/10 case', () => {
    const selections = [
      { itemId: 1, selectedScore: 3.0 },
      { itemId: 2, selectedScore: 4.0 },
      { itemId: 3, selectedScore: 1.5 },
    ];
    const raw = calculator.calculateRaw(selections); // 8.5
    const normalised = calculator.calculateNormalised(raw, 10.0); // 8.50
    expect(raw).toBe(8.5);
    expect(normalised).toBe(8.5);
  });
});
