import type { RubricRepository } from '../repositories/rubric.repository';
import type { RubricParserService } from './file-parser.service';

const SUPPORTED_FORMATS = ['yaml', 'yml', 'json'];

class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

export class RubricImporter {
  constructor(
    private readonly repo: RubricRepository,
    private readonly parser: RubricParserService,
  ) {}

  async importFromFile(
    moduleId: number,
    academicYear: string,
    content: Buffer,
    filename: string,
    confirmOverwrite: boolean,
  ): Promise<void> {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (!SUPPORTED_FORMATS.includes(ext)) {
      throw new AppError(`Unsupported file format: .${ext}`, 'UNSUPPORTED_FORMAT');
    }

    const existing = await this.repo.findByModule(moduleId, academicYear);
    if (existing && !confirmOverwrite) {
      throw new AppError('Rubric already exists. Set confirm=true to overwrite.', 'REQUIRES_CONFIRMATION');
    }

    const parsed = await this.parser.parseRubric(content, filename);

    const items = parsed.items.map((item) => ({
      ...item,
      levels: item.levels.map((level) => ({
        ...level,
        score: level.name === 'Mal' ? 0 : level.score,
      })),
    }));

    await this.repo.replaceAll(moduleId, academicYear, items);
  }
}
