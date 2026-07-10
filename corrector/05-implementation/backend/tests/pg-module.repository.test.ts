// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { PgModuleRepository } from '../src/repositories/postgres/pg-module.repository';
import { makeFakeSql } from './helpers/fake-sql';

const ROW = {
  id: 1,
  name: 'Programación',
  weeklyHours: 6,
  cycleId: 1,
  cycleName: 'DAW',
  legislationId: 1,
  legislationName: 'LOMLOE',
};

describe('PgModuleRepository', () => {
  it('findAll returns mapped rows', async () => {
    const sql = makeFakeSql([[ROW]]);
    const repo = new PgModuleRepository(sql);
    const result = await repo.findAll();
    expect(result).toEqual([ROW]);
    expect(sql.calls.length).toBe(1);
  });

  it('findById returns the row when found', async () => {
    const sql = makeFakeSql([[ROW]]);
    const repo = new PgModuleRepository(sql);
    expect(await repo.findById(1)).toEqual(ROW);
  });

  it('findById returns null when not found', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgModuleRepository(sql);
    expect(await repo.findById(999)).toBeNull();
  });

  it('findByNameAndCycle returns the row when found', async () => {
    const sql = makeFakeSql([[ROW]]);
    const repo = new PgModuleRepository(sql);
    expect(await repo.findByNameAndCycle('Programación', 1, 1)).toEqual(ROW);
  });

  it('findByNameAndCycle returns null when not found', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgModuleRepository(sql);
    expect(await repo.findByNameAndCycle('Nope', 1, 1)).toBeNull();
  });

  it('create inserts and returns the new row', async () => {
    const sql = makeFakeSql([[ROW]]);
    const repo = new PgModuleRepository(sql);
    const result = await repo.create({
      name: 'Programación',
      weeklyHours: 6,
      cycleId: 1,
      legislationId: 1,
    });
    expect(result).toEqual(ROW);
  });

  it('update returns the updated row', async () => {
    const updated = { ...ROW, name: 'Programación II' };
    const sql = makeFakeSql([[updated]]);
    const repo = new PgModuleRepository(sql);
    expect(await repo.update(1, { name: 'Programación II' })).toEqual(updated);
  });

  it('update throws NOT_FOUND when no row is updated', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgModuleRepository(sql);
    await expect(repo.update(999, { name: 'Nope' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('delete resolves when a row is deleted', async () => {
    // delete() first clears teacher_module assignments (RESTRICT FK), then deletes the module.
    const sql = makeFakeSql([[], [{ id: 1 }]]);
    const repo = new PgModuleRepository(sql);
    await expect(repo.delete(1)).resolves.toBeUndefined();
  });

  it('delete throws NOT_FOUND when no row is deleted', async () => {
    const sql = makeFakeSql([[], []]);
    const repo = new PgModuleRepository(sql);
    await expect(repo.delete(999)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('hasProjects returns true when a project references the module', async () => {
    const sql = makeFakeSql([[{ exists: true }]]);
    const repo = new PgModuleRepository(sql);
    expect(await repo.hasProjects(1)).toBe(true);
  });

  it('hasProjects returns false when no project references the module', async () => {
    const sql = makeFakeSql([[{ exists: false }]]);
    const repo = new PgModuleRepository(sql);
    expect(await repo.hasProjects(1)).toBe(false);
  });

  it('isTeacherAssigned returns true when the teacher is assigned', async () => {
    const sql = makeFakeSql([[{ exists: true }]]);
    const repo = new PgModuleRepository(sql);
    expect(await repo.isTeacherAssigned(1, 1)).toBe(true);
  });

  it('isTeacherAssigned returns false when the teacher is not assigned', async () => {
    const sql = makeFakeSql([[{ exists: false }]]);
    const repo = new PgModuleRepository(sql);
    expect(await repo.isTeacherAssigned(1, 1)).toBe(false);
  });
});
