import type { StudentRepository } from '../repositories/student.repository';
import type { FileParserService } from './file-parser.service';

const SUPPORTED_FORMATS = ['csv', 'json', 'yaml', 'yml'];

class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

export class StudentImporter {
  constructor(
    private readonly repo: StudentRepository,
    private readonly parser: FileParserService,
  ) {}

  async importFromFile(content: Buffer, filename: string): Promise<{ created: number }> {
    const ext = filename.split('.').pop()?.toLowerCase() ?? '';
    if (!SUPPORTED_FORMATS.includes(ext)) {
      throw new AppError(`Unsupported file format: .${ext}`, 'UNSUPPORTED_FORMAT');
    }

    const students = await this.parser.parseStudents(content, filename);

    let created = 0;
    for (const student of students) {
      await this.repo.create(student);
      created++;
    }

    return { created };
  }
}
