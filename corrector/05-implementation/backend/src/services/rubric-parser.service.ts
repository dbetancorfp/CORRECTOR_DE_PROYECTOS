import { parse as parseYaml } from 'yaml';
import type { ParsedRubric, ParsedRubricItem, ParsedRubricLevel, RubricParserService } from './file-parser.service';

const CANONICAL_LEVEL_NAMES: Record<string, string> = {
  excelente: 'Excelente',
  'muy bien': 'Muy bien',
  'muy_bien': 'Muy bien',
  muybien: 'Muy bien',
  bien: 'Bien',
  regular: 'Regular',
  mal: 'Mal',
};

class AppError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

function normalizeLevelName(raw: string): string {
  const key = raw.trim().toLowerCase();
  const canonical = CANONICAL_LEVEL_NAMES[key];
  if (!canonical) {
    throw new AppError(`Unknown rubric level name: "${raw}"`, 'VALIDATION_ERROR');
  }
  return canonical;
}

function parseCsv(content: Buffer): ParsedRubric {
  const text = content.toString('utf-8').trim();
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { items: [] };

  const headers = lines[0].split(',').map((h) => h.trim());
  const itemIdx = headers.findIndex((h) => h.toLowerCase() === 'item');
  if (itemIdx === -1) {
    throw new AppError('Missing required CSV column: item', 'VALIDATION_ERROR');
  }
  const levelColumns = headers
    .map((h, i) => ({ name: h, index: i }))
    .filter(({ index }) => index !== itemIdx);

  const items: ParsedRubricItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim());
    const description = cols[itemIdx];
    if (!description) {
      throw new AppError(`Row ${i + 1} is missing the item description`, 'VALIDATION_ERROR');
    }
    const levels: ParsedRubricLevel[] = levelColumns.map(({ name, index }, order) => ({
      name: normalizeLevelName(name),
      score: Number(cols[index]),
      displayOrder: order + 1,
    }));
    items.push({ description, displayOrder: i, levels });
  }
  return { items };
}

function normalizeStructured(parsed: unknown): ParsedRubric {
  const data = parsed as { items?: Array<{ description?: string; displayOrder?: number; levels?: Array<{ name?: string; score?: number; displayOrder?: number }> }> };
  if (!data.items || !Array.isArray(data.items)) {
    throw new AppError('Rubric file must define an "items" array', 'VALIDATION_ERROR');
  }
  const items: ParsedRubricItem[] = data.items.map((item, i) => {
    if (!item.description || !item.levels) {
      throw new AppError(`Item ${i + 1} is missing description or levels`, 'VALIDATION_ERROR');
    }
    return {
      description: item.description,
      displayOrder: item.displayOrder ?? i + 1,
      levels: item.levels.map((level, j) => ({
        name: normalizeLevelName(level.name ?? ''),
        score: Number(level.score),
        displayOrder: level.displayOrder ?? j + 1,
      })),
    };
  });
  return { items };
}

export class RubricFileParserService implements RubricParserService {
  async parseRubric(content: Buffer, filename: string): Promise<ParsedRubric> {
    const ext = (filename.split('.').pop() ?? '').toLowerCase();
    if (ext === 'csv') return parseCsv(content);
    if (ext === 'json') return normalizeStructured(JSON.parse(content.toString('utf-8')));
    if (ext === 'yaml' || ext === 'yml') return normalizeStructured(parseYaml(content.toString('utf-8')));
    throw new AppError(`Unsupported file format: .${ext}`, 'UNSUPPORTED_FORMAT');
  }
}
