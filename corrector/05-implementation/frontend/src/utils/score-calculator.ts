export interface ScoreSelection {
  itemId: number;
  selectedScore: number;
}

export class ScoreCalculator {
  calculateRaw(selections: ScoreSelection[]): number {
    return selections.reduce((sum, s) => sum + s.selectedScore, 0);
  }

  calculateNormalised(obtained: number, max: number): number {
    if (max === 0) return 0;
    const result = (obtained / max) * 10;
    return Math.round(result * 100) / 100;
  }
}
