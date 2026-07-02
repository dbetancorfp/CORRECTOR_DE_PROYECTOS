import type { ModuleRepository } from '../repositories/module.repository';
import type { ParsedStudent, StudentParserService } from './file-parser.service';

export class CsvStudentParserService implements StudentParserService {
  constructor(private readonly moduleRepo: ModuleRepository) {}

  async parseStudents(content: Buffer, _filename: string): Promise<ParsedStudent[]> {
    const text = content.toString('utf-8').trim();
    const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map((h) => h.trim());
    const nombreIdx = headers.indexOf('nombre');
    const moduloIdx = headers.indexOf('modulo');

    if (nombreIdx === -1 || moduloIdx === -1) {
      throw Object.assign(
        new Error('Missing required CSV columns: nombre, modulo'),
        { code: 'VALIDATION_ERROR' },
      );
    }

    const students: ParsedStudent[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c) => c.trim());
      const nombre = cols[nombreIdx];
      const moduloName = cols[moduloIdx];

      if (!nombre || !moduloName) {
        throw Object.assign(
          new Error(`Row ${i} is missing required fields`),
          { code: 'VALIDATION_ERROR' },
        );
      }

      const modules = await this.moduleRepo.findAll({ name: moduloName });
      const mod = modules.find((m) => m.name === moduloName);
      students.push({
        name: nombre,
        cycleId: mod?.cycleId ?? 0,
        moduleId: mod?.id ?? 0,
      });
    }
    return students;
  }
}
