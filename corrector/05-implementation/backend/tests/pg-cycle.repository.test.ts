// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { PgCycleRepository } from '../src/repositories/postgres/pg-cycle.repository';
import { makeFakeSql } from './helpers/fake-sql';

const ROW = { id: 1, name: 'DAW' };

describe('PgCycleRepository', () => {
  it('findAll returns mapped rows', async () => {
    const sql = makeFakeSql([[ROW]]);
    const repo = new PgCycleRepository(sql);
    const result = await repo.findAll();
    expect(result).toEqual([ROW]);
    expect(sql.calls.length).toBe(1);
  });

  it('findById returns the row when found', async () => {
    const sql = makeFakeSql([[ROW]]);
    const repo = new PgCycleRepository(sql);
    expect(await repo.findById(1)).toEqual(ROW);
  });

  it('findById returns null when not found', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgCycleRepository(sql);
    expect(await repo.findById(999)).toBeNull();
  });

  it('findByName returns the row when found', async () => {
    const sql = makeFakeSql([[ROW]]);
    const repo = new PgCycleRepository(sql);
    expect(await repo.findByName('DAW')).toEqual(ROW);
  });

  it('findByName returns null when not found', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgCycleRepository(sql);
    expect(await repo.findByName('NOPE')).toBeNull();
  });

  it('create inserts and returns the new row', async () => {
    const sql = makeFakeSql([[ROW]]);
    const repo = new PgCycleRepository(sql);
    expect(await repo.create('DAW')).toEqual(ROW);
  });

  it('update returns the updated row', async () => {
    const updated = { id: 1, name: 'DAM' };
    const sql = makeFakeSql([[updated]]);
    const repo = new PgCycleRepository(sql);
    expect(await repo.update(1, 'DAM')).toEqual(updated);
  });

  it('update throws NOT_FOUND when no row is updated', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgCycleRepository(sql);
    await expect(repo.update(999, 'DAM')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('delete resolves when a row is deleted', async () => {
    const sql = makeFakeSql([[{ id: 1 }]]);
    const repo = new PgCycleRepository(sql);
    await expect(repo.delete(1)).resolves.toBeUndefined();
  });

  it('delete throws NOT_FOUND when no row is deleted', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgCycleRepository(sql);
    await expect(repo.delete(999)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('hasModules returns true when a module references the cycle', async () => {
    const sql = makeFakeSql([[{ exists: true }]]);
    const repo = new PgCycleRepository(sql);
    expect(await repo.hasModules(1)).toBe(true);
  });

  it('hasModules returns false when no module references the cycle', async () => {
    const sql = makeFakeSql([[{ exists: false }]]);
    const repo = new PgCycleRepository(sql);
    expect(await repo.hasModules(1)).toBe(false);
  });
});
