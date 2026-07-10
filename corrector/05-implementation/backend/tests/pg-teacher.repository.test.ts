// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { PgTeacherRepository } from '../src/repositories/postgres/pg-teacher.repository';
import { makeFakeSql } from './helpers/fake-sql';

const LIST_ITEM = {
  id: 1,
  username: 'jdoe',
  role: 'profesor' as const,
  passwordStatus: 'default' as const,
  accountLocked: false,
  failedLoginAttempts: 0,
  modules: [{ id: 1, name: 'Programación' }],
};

const AUTH_TEACHER = {
  id: 1,
  username: 'jdoe',
  passwordHash: '$2b$10$hash',
  role: 'profesor' as const,
  accountLocked: false,
  failedLoginAttempts: 0,
  mustChangePassword: true,
};

describe('PgTeacherRepository', () => {
  it('findAll returns mapped rows', async () => {
    const sql = makeFakeSql([[LIST_ITEM]]);
    const repo = new PgTeacherRepository(sql);
    expect(await repo.findAll({})).toEqual([LIST_ITEM]);
    expect(sql.calls.length).toBe(1);
  });

  it('findById returns the auth teacher when found', async () => {
    const sql = makeFakeSql([[AUTH_TEACHER]]);
    const repo = new PgTeacherRepository(sql);
    expect(await repo.findById(1)).toEqual(AUTH_TEACHER);
  });

  it('findById returns null when not found', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgTeacherRepository(sql);
    expect(await repo.findById(999)).toBeNull();
  });

  it('findByUsername returns the auth teacher when found', async () => {
    const sql = makeFakeSql([[AUTH_TEACHER]]);
    const repo = new PgTeacherRepository(sql);
    expect(await repo.findByUsername('jdoe')).toEqual(AUTH_TEACHER);
  });

  it('findByUsername returns null when not found', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgTeacherRepository(sql);
    expect(await repo.findByUsername('nope')).toBeNull();
  });

  it('save inserts teacher + module assignment and returns the list item', async () => {
    const sql = makeFakeSql([[{ id: 1 }], [{}], [LIST_ITEM]]);
    const repo = new PgTeacherRepository(sql);
    const result = await repo.save({
      username: 'jdoe',
      passwordHash: '$2b$10$hash',
      role: 'profesor',
      mustChangePassword: true,
      moduleId: 1,
    });
    expect(result).toEqual(LIST_ITEM);
    expect(sql.calls.length).toBe(3);
  });

  it('update returns the updated list item', async () => {
    const updated = { ...LIST_ITEM, username: 'jdoe2' };
    const sql = makeFakeSql([[{ id: 1 }], [updated]]);
    const repo = new PgTeacherRepository(sql);
    expect(await repo.update(1, { username: 'jdoe2' })).toEqual(updated);
  });

  it('update throws NOT_FOUND when no row is updated', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgTeacherRepository(sql);
    await expect(repo.update(999, { username: 'nope' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('delete resolves when a row is deleted', async () => {
    const sql = makeFakeSql([[{ id: 1 }]]);
    const repo = new PgTeacherRepository(sql);
    await expect(repo.delete(1)).resolves.toBeUndefined();
  });

  it('delete throws NOT_FOUND when no row is deleted', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgTeacherRepository(sql);
    await expect(repo.delete(999)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('hasCorrections returns true when a correction references the teacher', async () => {
    const sql = makeFakeSql([[{ exists: true }]]);
    const repo = new PgTeacherRepository(sql);
    expect(await repo.hasCorrections(1)).toBe(true);
  });

  it('hasCorrections returns false when no correction references the teacher', async () => {
    const sql = makeFakeSql([[{ exists: false }]]);
    const repo = new PgTeacherRepository(sql);
    expect(await repo.hasCorrections(1)).toBe(false);
  });

  it('updateFailedAttempts resolves', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgTeacherRepository(sql);
    await expect(repo.updateFailedAttempts(1, 2)).resolves.toBeUndefined();
  });

  it('resetFailedAttempts resolves', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgTeacherRepository(sql);
    await expect(repo.resetFailedAttempts(1)).resolves.toBeUndefined();
  });

  it('lockAccount resolves', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgTeacherRepository(sql);
    await expect(repo.lockAccount(1)).resolves.toBeUndefined();
  });

  it('updatePassword resolves', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgTeacherRepository(sql);
    await expect(repo.updatePassword(1, '$2b$10$newhash')).resolves.toBeUndefined();
  });
});
