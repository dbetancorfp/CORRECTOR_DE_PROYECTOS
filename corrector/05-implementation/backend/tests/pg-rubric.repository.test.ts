// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { PgRubricRepository } from '../src/repositories/postgres/pg-rubric.repository';
import { makeFakeSql } from './helpers/fake-sql';

const LEVEL = { id: 1, name: 'Excelente', score: 10, displayOrder: 1 };
const ITEM = { id: 1, rubricId: 1, description: 'Diseño', displayOrder: 1, levels: [LEVEL] };

describe('PgRubricRepository', () => {
  it('findByModule returns the rubric with nested items when found', async () => {
    const sql = makeFakeSql([[{ id: 1, moduleId: 1, academicYear: '2024-2025' }], [ITEM]]);
    const repo = new PgRubricRepository(sql);
    const result = await repo.findByModule(1, '2024-2025');
    expect(result).toEqual({ id: 1, moduleId: 1, academicYear: '2024-2025', frozen: false, items: [ITEM] });
  });

  it('findByModule returns null when not found', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgRubricRepository(sql);
    expect(await repo.findByModule(1, '2024-2025')).toBeNull();
  });

  it('addItem reuses an existing rubric for the module + academic year', async () => {
    const sql = makeFakeSql([
      [{ id: 1 }], // find existing rubric
      [{ id: 1 }], // insert item
      [{}], // insert level
      [LEVEL], // find levels
    ]);
    const repo = new PgRubricRepository(sql);
    const result = await repo.addItem(1, {
      academicYear: '2024-2025',
      description: 'Diseño',
      displayOrder: 1,
      levels: [{ name: 'Excelente', score: 10, displayOrder: 1 }],
    });
    expect(result).toEqual(ITEM);
    expect(sql.calls.length).toBe(4);
  });

  it('addItem creates the rubric when none exists yet', async () => {
    const sql = makeFakeSql([
      [], // no existing rubric
      [{ id: 1 }], // insert rubric
      [{ id: 1 }], // insert item
      [{}], // insert level
      [LEVEL], // find levels
    ]);
    const repo = new PgRubricRepository(sql);
    const result = await repo.addItem(1, {
      academicYear: '2024-2025',
      description: 'Diseño',
      displayOrder: 1,
      levels: [{ name: 'Excelente', score: 10, displayOrder: 1 }],
    });
    expect(result).toEqual(ITEM);
    expect(sql.calls.length).toBe(5);
  });

  it('updateItem updates description only and returns current levels', async () => {
    const updatedRow = { id: 1, rubricId: 1, description: 'Diseño v2', displayOrder: 1 };
    const sql = makeFakeSql([[updatedRow], [LEVEL]]);
    const repo = new PgRubricRepository(sql);
    const result = await repo.updateItem(1, { description: 'Diseño v2' });
    expect(result).toEqual({ ...updatedRow, levels: [LEVEL] });
  });

  it('updateItem replaces levels when provided', async () => {
    const updatedRow = { id: 1, rubricId: 1, description: 'Diseño', displayOrder: 1 };
    const sql = makeFakeSql([[updatedRow], [{}], [{}], [LEVEL]]);
    const repo = new PgRubricRepository(sql);
    const result = await repo.updateItem(1, { levels: [{ name: 'Excelente', score: 10, displayOrder: 1 }] });
    expect(result).toEqual({ ...updatedRow, levels: [LEVEL] });
    expect(sql.calls.length).toBe(4);
  });

  it('updateItem throws NOT_FOUND when the item does not exist', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgRubricRepository(sql);
    await expect(repo.updateItem(999, { description: 'nope' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('deleteItem resolves when a row is deleted', async () => {
    const sql = makeFakeSql([[{ id: 1 }]]);
    const repo = new PgRubricRepository(sql);
    await expect(repo.deleteItem(1)).resolves.toBeUndefined();
  });

  it('deleteItem throws NOT_FOUND when no row is deleted', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgRubricRepository(sql);
    await expect(repo.deleteItem(999)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('isFrozen always returns false without querying the database', async () => {
    const sql = makeFakeSql([]);
    const repo = new PgRubricRepository(sql);
    expect(await repo.isFrozen(1)).toBe(false);
    expect(await repo.isFrozen(1, '2024-2025')).toBe(false);
    expect(sql.calls.length).toBe(0);
  });

  it('getExcelenteSumExcluding returns the summed score', async () => {
    const sql = makeFakeSql([[{ sum: 18 }]]);
    const repo = new PgRubricRepository(sql);
    expect(await repo.getExcelenteSumExcluding(1, 5)).toBe(18);
  });

  it('replaceAll replaces every item and level for the rubric', async () => {
    const sql = makeFakeSql([
      [{ id: 1 }], // find existing rubric
      [{}], // delete existing items
      [{ id: 1 }], // insert item
      [{}], // insert level
    ]);
    const repo = new PgRubricRepository(sql);
    await repo.replaceAll(1, '2024-2025', [
      { academicYear: '2024-2025', description: 'Diseño', displayOrder: 1, levels: [{ name: 'Excelente', score: 10, displayOrder: 1 }] },
    ]);
    expect(sql.calls.length).toBe(4);
  });
});
