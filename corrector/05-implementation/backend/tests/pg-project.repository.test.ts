// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { PgProjectRepository } from '../src/repositories/postgres/pg-project.repository';
import { makeFakeSql } from './helpers/fake-sql';

const PROJECT = {
  id: 1,
  name: 'TFC App',
  academicYear: '2024-2025',
  moduleId: 1,
  moduleName: 'Programación',
  cycleName: 'DAW',
  studentCount: 2,
};

describe('PgProjectRepository', () => {
  it('findAll returns mapped rows', async () => {
    const sql = makeFakeSql([[PROJECT]]);
    const repo = new PgProjectRepository(sql);
    expect(await repo.findAll()).toEqual([PROJECT]);
    expect(sql.calls.length).toBe(1);
  });

  it('findById returns the row when found', async () => {
    const sql = makeFakeSql([[PROJECT]]);
    const repo = new PgProjectRepository(sql);
    expect(await repo.findById(1)).toEqual(PROJECT);
  });

  it('findById returns null when not found', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgProjectRepository(sql);
    expect(await repo.findById(999)).toBeNull();
  });

  it('create inserts and returns the new row with studentCount 0', async () => {
    const created = { ...PROJECT, studentCount: 0 };
    const sql = makeFakeSql([[{ id: 1 }], [created]]);
    const repo = new PgProjectRepository(sql);
    const result = await repo.create({ name: 'TFC App', academicYear: '2024-2025', moduleId: 1 });
    expect(result).toEqual(created);
  });

  it('update returns the updated row', async () => {
    const updated = { ...PROJECT, name: 'TFC App v2' };
    const sql = makeFakeSql([[{ id: 1 }], [updated]]);
    const repo = new PgProjectRepository(sql);
    expect(await repo.update(1, { name: 'TFC App v2' })).toEqual(updated);
  });

  it('update throws NOT_FOUND when no row is updated', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgProjectRepository(sql);
    await expect(repo.update(999, { name: 'nope' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('delete resolves when a row is deleted', async () => {
    const sql = makeFakeSql([[{ id: 1 }]]);
    const repo = new PgProjectRepository(sql);
    await expect(repo.delete(1)).resolves.toBeUndefined();
  });

  it('delete throws NOT_FOUND when no row is deleted', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgProjectRepository(sql);
    await expect(repo.delete(999)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('hasStudents returns true when the project has members', async () => {
    const sql = makeFakeSql([[{ exists: true }]]);
    const repo = new PgProjectRepository(sql);
    expect(await repo.hasStudents(1)).toBe(true);
  });

  it('hasStudents returns false when the project has no members', async () => {
    const sql = makeFakeSql([[{ exists: false }]]);
    const repo = new PgProjectRepository(sql);
    expect(await repo.hasStudents(1)).toBe(false);
  });
});
