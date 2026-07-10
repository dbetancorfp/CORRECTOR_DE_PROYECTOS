// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { PgStudentRepository } from '../src/repositories/postgres/pg-student.repository';
import { makeFakeSql } from './helpers/fake-sql';

const STUDENT = {
  id: 1,
  name: 'JJ499',
  cycleId: 1,
  cycleName: 'DAW',
  modules: [{ id: 1, name: 'Programación' }],
};

describe('PgStudentRepository', () => {
  it('findAll returns mapped rows', async () => {
    const sql = makeFakeSql([[STUDENT]]);
    const repo = new PgStudentRepository(sql);
    expect(await repo.findAll()).toEqual([STUDENT]);
    expect(sql.calls.length).toBe(1);
  });

  it('findById returns the row when found', async () => {
    const sql = makeFakeSql([[STUDENT]]);
    const repo = new PgStudentRepository(sql);
    expect(await repo.findById(1)).toEqual(STUDENT);
  });

  it('findById returns null when not found', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgStudentRepository(sql);
    expect(await repo.findById(999)).toBeNull();
  });

  it('create inserts the student, enrolls in the module, and returns it', async () => {
    const sql = makeFakeSql([[{ id: 1 }], [{}], [STUDENT]]);
    const repo = new PgStudentRepository(sql);
    const result = await repo.create({ name: 'JJ499', cycleId: 1, moduleId: 1 });
    expect(result).toEqual(STUDENT);
    expect(sql.calls.length).toBe(3);
  });

  it('update returns the updated row', async () => {
    const updated = { ...STUDENT, name: 'MnP454' };
    const sql = makeFakeSql([[{ id: 1 }], [updated]]);
    const repo = new PgStudentRepository(sql);
    expect(await repo.update(1, { name: 'MnP454' })).toEqual(updated);
  });

  it('update throws NOT_FOUND when no row is updated', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgStudentRepository(sql);
    await expect(repo.update(999, { name: 'nope' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('delete resolves when a row is deleted', async () => {
    const sql = makeFakeSql([[{ id: 1 }]]);
    const repo = new PgStudentRepository(sql);
    await expect(repo.delete(1)).resolves.toBeUndefined();
  });

  it('delete throws NOT_FOUND when no row is deleted', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgStudentRepository(sql);
    await expect(repo.delete(999)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('isAssignedToProject returns true when the student is a project member', async () => {
    const sql = makeFakeSql([[{ exists: true }]]);
    const repo = new PgStudentRepository(sql);
    expect(await repo.isAssignedToProject(1)).toBe(true);
  });

  it('isAssignedToProject returns false when the student is not a project member', async () => {
    const sql = makeFakeSql([[{ exists: false }]]);
    const repo = new PgStudentRepository(sql);
    expect(await repo.isAssignedToProject(1)).toBe(false);
  });
});
