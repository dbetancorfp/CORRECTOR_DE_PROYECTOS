// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { PgLegislationRepository } from '../src/repositories/postgres/pg-legislation.repository';
import { makeFakeSql } from './helpers/fake-sql';

const ROW = { id: 1, name: 'LOMLOE', startYear: 2020 };

describe('PgLegislationRepository', () => {
  it('findAll returns mapped rows', async () => {
    const sql = makeFakeSql([[ROW]]);
    const repo = new PgLegislationRepository(sql);
    const result = await repo.findAll();
    expect(result).toEqual([ROW]);
    expect(sql.calls.length).toBe(1);
  });

  it('findById returns the row when found', async () => {
    const sql = makeFakeSql([[ROW]]);
    const repo = new PgLegislationRepository(sql);
    const result = await repo.findById(1);
    expect(result).toEqual(ROW);
  });

  it('findById returns null when not found', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgLegislationRepository(sql);
    const result = await repo.findById(999);
    expect(result).toBeNull();
  });

  it('findByName returns the row when found', async () => {
    const sql = makeFakeSql([[ROW]]);
    const repo = new PgLegislationRepository(sql);
    const result = await repo.findByName('LOMLOE');
    expect(result).toEqual(ROW);
  });

  it('findByName returns null when not found', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgLegislationRepository(sql);
    const result = await repo.findByName('NOPE');
    expect(result).toBeNull();
  });

  it('create inserts and returns the new row', async () => {
    const sql = makeFakeSql([[ROW]]);
    const repo = new PgLegislationRepository(sql);
    const result = await repo.create('LOMLOE', 2020);
    expect(result).toEqual(ROW);
  });

  it('update returns the updated row', async () => {
    const updated = { ...ROW, name: 'LOE' };
    const sql = makeFakeSql([[updated]]);
    const repo = new PgLegislationRepository(sql);
    const result = await repo.update(1, { name: 'LOE' });
    expect(result).toEqual(updated);
  });

  it('update throws NOT_FOUND when no row is updated', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgLegislationRepository(sql);
    await expect(repo.update(999, { name: 'LOE' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('delete resolves when a row is deleted', async () => {
    const sql = makeFakeSql([[{ id: 1 }]]);
    const repo = new PgLegislationRepository(sql);
    await expect(repo.delete(1)).resolves.toBeUndefined();
  });

  it('delete throws NOT_FOUND when no row is deleted', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgLegislationRepository(sql);
    await expect(repo.delete(999)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('hasModules returns true when a module references the legislation', async () => {
    const sql = makeFakeSql([[{ exists: true }]]);
    const repo = new PgLegislationRepository(sql);
    const result = await repo.hasModules(1);
    expect(result).toBe(true);
  });

  it('hasModules returns false when no module references the legislation', async () => {
    const sql = makeFakeSql([[{ exists: false }]]);
    const repo = new PgLegislationRepository(sql);
    const result = await repo.hasModules(1);
    expect(result).toBe(false);
  });
});
