import type { CorrectionRepository, CorrectionResult, UpsertCorrectionData } from '../repositories/correction.repository';
import type { RubricRepository } from '../repositories/rubric.repository';
import type { ScoreCalculator } from './score-calculator';

class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

export class CorrectionService {
  constructor(
    private readonly correctionRepo: CorrectionRepository,
    private readonly rubricRepo: RubricRepository,
    private readonly calculator: ScoreCalculator,
  ) {}

  async findExisting(studentId: number, projectId: number): Promise<CorrectionResult | null> {
    return this.correctionRepo.findByStudentAndProject(studentId, projectId);
  }

  async upsert(data: UpsertCorrectionData): Promise<CorrectionResult> {
    const rubric = await this.rubricRepo.findByModule(data.moduleId, data.academicYear);
    if (!rubric) {
      throw new AppError('No rubric defined for this module and academic year', 'NO_RUBRIC');
    }

    if (data.items.length === 0 || data.items.length < rubric.items.length) {
      throw new AppError('All rubric items must have a level selected', 'INCOMPLETE_SELECTION');
    }

    for (const selection of data.items) {
      const rubricItem = rubric.items.find((i) => i.id === selection.rubricItemId);
      if (!rubricItem) {
        throw new AppError(`Rubric item ${selection.rubricItemId} not found`, 'INVALID_LEVEL_ASSIGNMENT');
      }
      const levelBelongsToItem = rubricItem.levels.some((l) => l.id === selection.rubricLevelId);
      if (!levelBelongsToItem) {
        throw new AppError(
          `Level ${selection.rubricLevelId} does not belong to item ${selection.rubricItemId}`,
          'INVALID_LEVEL_ASSIGNMENT',
        );
      }
    }

    const selections = data.items.map((sel) => {
      const item = rubric.items.find((i) => i.id === sel.rubricItemId)!;
      const level = item.levels.find((l) => l.id === sel.rubricLevelId)!;
      return { selectedScore: level.score };
    });

    const maxSelections = rubric.items.map((item) => {
      const maxScore = Math.max(...item.levels.map((l) => l.score));
      return { selectedScore: maxScore };
    });

    const rawScore = this.calculator.calculateRaw(selections);
    const maxScore = this.calculator.calculateRaw(maxSelections);
    const finalScore = this.calculator.calculateNormalised(rawScore, maxScore);

    const stored = await this.correctionRepo.upsert({ ...data, finalScore });
    return { ...stored, finalScore };
  }
}
