// sketchNumbers: 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100
// UC-08: Gestión de Rúbrica

import { describe, it, expect } from 'bun:test';
import { RubricService } from '../src/services/rubric.service';
import { RubricImporter } from '../src/services/rubric-importer';
import type { RubricRepository } from '../src/repositories/rubric.repository';
import type { FileParserService } from '../src/services/file-parser.service';

const BASE_URL = 'http://localhost:3456';

// ── Domain doubles ────────────────────────────────────────────────────────────

const baseRubric = {
  id: 1,
  moduleId: 1,
  academicYear: '2024-2025',
  frozen: false,
  items: [
    {
      id: 1,
      description: 'Diseño de la interfaz',
      displayOrder: 1,
      levels: [
        { id: 1, name: 'Excelente', score: 3.0, displayOrder: 1 },
        { id: 2, name: 'Bien',      score: 2.0, displayOrder: 2 },
        { id: 3, name: 'Mal',       score: 0.0, displayOrder: 3 },
      ],
    },
  ],
};

function makeRepo(overrides: Partial<RubricRepository> = {}): RubricRepository {
  return {
    findByModule: async () => baseRubric,
    addItem: async (moduleId, item) => ({ id: 99, ...item, rubricId: 1 }),
    updateItem: async () => baseRubric.items[0],
    deleteItem: async () => {},
    isFrozen: async () => false,
    getExcelenteSumExcluding: async () => 0,
    replaceAll: async () => {},
    ...overrides,
  };
}

function makeParser(overrides: Partial<FileParserService> = {}): FileParserService {
  return {
    parseStudents: async () => [],
    parseRubric: async () => ({
      items: [
        { description: 'Documentación', levels: [
          { name: 'Excelente', score: 3.0, displayOrder: 1 },
          { name: 'Bien',      score: 2.0, displayOrder: 2 },
          { name: 'Mal',       score: 0.0, displayOrder: 3 },
        ], displayOrder: 1 },
      ],
    }),
    ...overrides,
  };
}

// ── Element #96 — Mal level invariant (always 0) ─────────────────────────────

describe('Element #96 — RubricService: Mal level is always 0 (domain invariant)', () => {
  it('throws when an item has a Mal level with score !== 0', async () => {
    const service = new RubricService(makeRepo());
    await expect(service.addItem(1, {
      academicYear: '2024-2025',
      description: 'Test item',
      displayOrder: 2,
      levels: [
        { name: 'Excelente', score: 3.0, displayOrder: 1 },
        { name: 'Bien',      score: 2.0, displayOrder: 2 },
        { name: 'Mal',       score: 1.0, displayOrder: 3 }, // INVALID
      ],
    })).rejects.toMatchObject({ code: 'MAL_NONZERO' });
  });

  it('accepts item with Mal level score === 0', async () => {
    const service = new RubricService(makeRepo());
    const result = await service.addItem(1, {
      academicYear: '2024-2025',
      description: 'Test item',
      displayOrder: 2,
      levels: [
        { name: 'Excelente', score: 3.0, displayOrder: 1 },
        { name: 'Bien',      score: 2.0, displayOrder: 2 },
        { name: 'Mal',       score: 0.0, displayOrder: 3 },
      ],
    });
    expect(result.levels.find(l => l.name === 'Mal')?.score).toBe(0);
  });
});

// ── Element #94 — Excelente sum constraint (max 10) ──────────────────────────

describe('Elements #94 #98 — RubricService: Excelente sum must not exceed 10', () => {
  it('throws SCORE_LIMIT_EXCEEDED when new item would push Excelente sum above 10', async () => {
    const repo = makeRepo({ getExcelenteSumExcluding: async () => 8.0 });
    const service = new RubricService(repo);
    await expect(service.addItem(1, {
      academicYear: '2024-2025',
      description: 'Expensive item',
      displayOrder: 2,
      levels: [
        { name: 'Excelente', score: 3.0, displayOrder: 1 }, // 8 + 3 = 11 > 10
        { name: 'Mal',       score: 0.0, displayOrder: 2 },
      ],
    })).rejects.toMatchObject({ code: 'SCORE_LIMIT_EXCEEDED' });
  });

  it('accepts item when sum would be exactly 10', async () => {
    const repo = makeRepo({ getExcelenteSumExcluding: async () => 7.0 });
    const service = new RubricService(repo);
    const result = await service.addItem(1, {
      academicYear: '2024-2025',
      description: 'Fitting item',
      displayOrder: 2,
      levels: [
        { name: 'Excelente', score: 3.0, displayOrder: 1 }, // 7 + 3 = 10 ✅
        { name: 'Mal',       score: 0.0, displayOrder: 2 },
      ],
    });
    expect(result).toBeDefined();
  });

  it('throws SCORE_LIMIT_EXCEEDED on edit when new Excelente value would exceed 10', async () => {
    const repo = makeRepo({ getExcelenteSumExcluding: async (moduleId, excludeItemId) => 9.0 });
    const service = new RubricService(repo);
    await expect(service.updateItem(1, {
      description: 'Updated',
      levels: [{ name: 'Excelente', score: 2.0, displayOrder: 1 }],
    })).rejects.toMatchObject({ code: 'SCORE_LIMIT_EXCEEDED' });
  });
});

// ── Element #91 — Max 5 levels ────────────────────────────────────────────────

describe('Element #91 — RubricService: maximum 5 levels per item', () => {
  it('throws when item has more than 5 levels', async () => {
    const service = new RubricService(makeRepo());
    await expect(service.addItem(1, {
      academicYear: '2024-2025',
      description: 'Too many levels',
      displayOrder: 2,
      levels: [
        { name: 'Excelente', score: 2.0, displayOrder: 1 },
        { name: 'Muy bien',  score: 1.5, displayOrder: 2 },
        { name: 'Bien',      score: 1.0, displayOrder: 3 },
        { name: 'Regular',   score: 0.5, displayOrder: 4 },
        { name: 'Mal',       score: 0.0, displayOrder: 5 },
        { name: 'Extra',     score: 0.0, displayOrder: 6 }, // > 5
      ],
    })).rejects.toThrow();
  });
});

// ── Frozen rubric (has corrections) ──────────────────────────────────────────

describe('Element #100 — RubricService: frozen rubric blocks edit and delete', () => {
  it('throws RUBRIC_FROZEN when trying to add item to frozen rubric', async () => {
    const repo = makeRepo({ isFrozen: async () => true });
    const service = new RubricService(repo);
    await expect(service.addItem(1, {
      academicYear: '2024-2025',
      description: 'New item',
      displayOrder: 2,
      levels: [
        { name: 'Excelente', score: 2.0, displayOrder: 1 },
        { name: 'Mal',       score: 0.0, displayOrder: 2 },
      ],
    })).rejects.toMatchObject({ code: 'RUBRIC_FROZEN' });
  });

  it('throws RUBRIC_FROZEN when trying to delete item from frozen rubric', async () => {
    const repo = makeRepo({ isFrozen: async () => true });
    const service = new RubricService(repo);
    await expect(service.deleteItem(1)).rejects.toMatchObject({ code: 'RUBRIC_FROZEN' });
  });

  it('GET rubric returns frozen=true when corrections exist', async () => {
    const repo = makeRepo({
      findByModule: async () => ({ ...baseRubric, frozen: true }),
    });
    const service = new RubricService(repo);
    const rubric = await service.getRubricForModule(1, '2024-2025');
    expect(rubric.frozen).toBe(true);
  });
});

// ── Element #99 — Rubric file upload: Mal forced to 0 ───────────────────────

describe('Element #99 — RubricImporter: file upload replaces rubric, Mal always 0', () => {
  it('forces Mal level score to 0 even if file has non-zero value', async () => {
    let replacedItems: Array<{ levels: Array<{ name: string; score: number }> }> = [];
    const repo = makeRepo({
      replaceAll: async (moduleId, academicYear, items) => {
        replacedItems = items as typeof replacedItems;
      },
    });
    const parser = makeParser({
      parseRubric: async () => ({
        items: [{
          description: 'Item',
          displayOrder: 1,
          levels: [
            { name: 'Excelente', score: 3.0, displayOrder: 1 },
            { name: 'Mal',       score: 2.0, displayOrder: 2 }, // file says 2, must be forced to 0
          ],
        }],
      }),
    });
    const importer = new RubricImporter(repo, parser);
    await importer.importFromFile(1, '2024-2025', Buffer.from('fake'), 'rubric.yaml', true);
    const malLevel = replacedItems[0].levels.find((l) => l.name === 'Mal');
    expect(malLevel?.score).toBe(0);
  });

  it('throws for unsupported file format', async () => {
    const importer = new RubricImporter(makeRepo(), makeParser());
    await expect(importer.importFromFile(1, '2024-2025', Buffer.from(''), 'rubric.xlsx', true))
      .rejects.toMatchObject({ code: 'UNSUPPORTED_FORMAT' });
  });

  it('requires confirmation=true when module already has a rubric', async () => {
    const repo = makeRepo({
      findByModule: async () => baseRubric, // rubric already exists
    });
    const importer = new RubricImporter(repo, makeParser());
    await expect(importer.importFromFile(1, '2024-2025', Buffer.from('fake'), 'rubric.yaml', false))
      .rejects.toMatchObject({ code: 'REQUIRES_CONFIRMATION' });
  });
});

// ── API integration tests ─────────────────────────────────────────────────────

describe('Element #90 — GET /api/modules/:id/rubric', () => {
  it('returns 200 with rubric items and levels', async () => {
    const res = await fetch(`${BASE_URL}/api/modules/1/rubric?academicYear=2024-2025`);
    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[]; frozen: boolean };
    expect(Array.isArray(body.items)).toBe(true);
    expect(typeof body.frozen).toBe('boolean');
  });

  it('returns 404 when module has no rubric', async () => {
    const res = await fetch(`${BASE_URL}/api/modules/99999/rubric?academicYear=2024-2025`);
    expect(res.status).toBe(404);
  });
});

describe('Element #98 — POST /api/modules/:id/rubric/items', () => {
  it('returns 201 with new rubric item', async () => {
    const res = await fetch(`${BASE_URL}/api/modules/1/rubric/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academicYear: '2024-2025',
        description: 'Documentación',
        displayOrder: 2,
        levels: [
          { name: 'Excelente', score: 2.0, displayOrder: 1 },
          { name: 'Bien',      score: 1.0, displayOrder: 2 },
          { name: 'Mal',       score: 0.0, displayOrder: 3 },
        ],
      }),
    });
    expect(res.status).toBe(201);
  });

  it('returns 400 when Mal level score is non-zero', async () => {
    const res = await fetch(`${BASE_URL}/api/modules/1/rubric/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academicYear: '2024-2025',
        description: 'Bad item',
        displayOrder: 2,
        levels: [
          { name: 'Excelente', score: 2.0, displayOrder: 1 },
          { name: 'Mal',       score: 1.0, displayOrder: 2 }, // invalid
        ],
      }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 when Excelente sum would exceed 10', async () => {
    const res = await fetch(`${BASE_URL}/api/modules/1/rubric/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academicYear: '2024-2025',
        description: 'Expensive item',
        displayOrder: 2,
        levels: [
          { name: 'Excelente', score: 11.0, displayOrder: 1 }, // exceeds 10 alone
          { name: 'Mal',       score: 0.0,  displayOrder: 2 },
        ],
      }),
    });
    expect(res.status).toBe(409);
  });

  it('returns 423 when rubric is frozen', async () => {
    const res = await fetch(`${BASE_URL}/api/modules/1/rubric/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        academicYear: '2024-2025',
        description: 'Item on frozen rubric',
        displayOrder: 2,
        levels: [{ name: 'Excelente', score: 1.0, displayOrder: 1 }, { name: 'Mal', score: 0.0, displayOrder: 2 }],
      }),
    });
    expect(res.status).toBe(423);
  });
});

describe('Element #97 — DELETE /api/rubric/items/:id', () => {
  it('returns 204 when item is deleted', async () => {
    const res = await fetch(`${BASE_URL}/api/rubric/items/1`, { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  it('returns 423 when rubric is frozen', async () => {
    const res = await fetch(`${BASE_URL}/api/rubric/items/1`, { method: 'DELETE' });
    expect(res.status).toBe(423);
  });
});
