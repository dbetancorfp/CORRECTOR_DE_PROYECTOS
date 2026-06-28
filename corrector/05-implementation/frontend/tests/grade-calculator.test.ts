// sketchNumbers: 119
// Final weighted grade calculation for tutor panoramic view

import { describe, it, expect } from 'bun:test';
import { GradeCalculator } from '../src/utils/grade-calculator';

// GradeCalculator is a pure utility class with no external dependencies.

describe('Element #119 — GradeCalculator: nota_final (weighted average)', () => {
  const calculator = new GradeCalculator();

  it('calculates weighted average of two modules', () => {
    const modules = [
      { moduleScore: 8.0, weeklyHours: 7 },
      { moduleScore: 6.0, weeklyHours: 5 },
    ];
    // (8×7 + 6×5) / (7+5) = (56+30)/12 = 86/12 ≈ 7.17
    expect(calculator.calculateFinalScore(modules)).toBe(7.17);
  });

  it('returns exactly 2 decimal places', () => {
    const modules = [
      { moduleScore: 7.0, weeklyHours: 3 },
      { moduleScore: 8.0, weeklyHours: 4 },
    ];
    const result = calculator.calculateFinalScore(modules);
    const decimals = (result.toString().split('.')[1] ?? '').length;
    expect(decimals).toBeLessThanOrEqual(2);
  });

  it('caps the result at 10 even if weighted sum would exceed 10', () => {
    const modules = [
      { moduleScore: 10.0, weeklyHours: 10 },
      { moduleScore: 10.0, weeklyHours: 10 },
    ];
    expect(calculator.calculateFinalScore(modules)).toBe(10);
  });

  it('returns 0 for an empty modules array', () => {
    expect(calculator.calculateFinalScore([])).toBe(0);
  });

  it('handles a single module (identity case)', () => {
    expect(calculator.calculateFinalScore([{ moduleScore: 7.50, weeklyHours: 7 }])).toBe(7.50);
  });

  it('handles three modules with different hours', () => {
    const modules = [
      { moduleScore: 10.0, weeklyHours: 7 },
      { moduleScore: 6.0,  weeklyHours: 5 },
      { moduleScore: 8.0,  weeklyHours: 3 },
    ];
    // (70 + 30 + 24) / 15 = 124/15 ≈ 8.27
    expect(calculator.calculateFinalScore(modules)).toBe(8.27);
  });

  it('handles all modules with score 0 (all Mal)', () => {
    const modules = [
      { moduleScore: 0, weeklyHours: 7 },
      { moduleScore: 0, weeklyHours: 5 },
    ];
    expect(calculator.calculateFinalScore(modules)).toBe(0);
  });

  it('is a pure function — calling it twice returns the same result', () => {
    const modules = [
      { moduleScore: 7.5, weeklyHours: 6 },
      { moduleScore: 8.0, weeklyHours: 4 },
    ];
    const r1 = calculator.calculateFinalScore(modules);
    const r2 = calculator.calculateFinalScore(modules);
    expect(r1).toBe(r2);
  });

  it('matches the formula defined in globalRules: sum(score × hours) / sum(hours)', () => {
    const modules = [
      { moduleScore: 9.0, weeklyHours: 2 },
      { moduleScore: 5.0, weeklyHours: 8 },
    ];
    const expected = Math.round(((9 * 2) + (5 * 8)) / (2 + 8) * 100) / 100;
    // (18 + 40) / 10 = 58/10 = 5.80
    expect(calculator.calculateFinalScore(modules)).toBe(expected);
  });
});
