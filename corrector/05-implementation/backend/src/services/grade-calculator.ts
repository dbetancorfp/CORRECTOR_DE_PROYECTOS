export interface ModuleGrade {
  moduleScore: number;
  weeklyHours: number;
}

export class GradeCalculator {
  calculateFinalScore(modules: ModuleGrade[]): number {
    if (modules.length === 0) return 0;

    const totalHours = modules.reduce((sum, m) => sum + m.weeklyHours, 0);
    if (totalHours === 0) return 0;

    const weightedSum = modules.reduce((sum, m) => sum + m.moduleScore * m.weeklyHours, 0);
    const result = weightedSum / totalHours;
    const capped = Math.min(result, 10);
    return Math.round(capped * 100) / 100;
  }
}
