// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { PgProjectStudentRepository } from '../src/repositories/postgres/pg-project-student.repository';
import { makeFakeSql } from './helpers/fake-sql';

describe('PgProjectStudentRepository', () => {
  it('findByProject returns mapped rows', async () => {
    const rows = [{ studentId: 1, name: 'JJ499' }];
    const sql = makeFakeSql([rows]);
    const repo = new PgProjectStudentRepository(sql);
    expect(await repo.findByProject(1)).toEqual(rows);
  });

  it('findAll returns mapped assignments', async () => {
    const rows = [
      { projectId: 1, projectName: 'TFC App', studentId: 1, studentName: 'JJ499', moduleName: 'Programación' },
    ];
    const sql = makeFakeSql([rows]);
    const repo = new PgProjectStudentRepository(sql);
    expect(await repo.findAll()).toEqual(rows);
  });

  it('countStudentsInProject returns the count', async () => {
    const sql = makeFakeSql([[{ count: 2 }]]);
    const repo = new PgProjectStudentRepository(sql);
    expect(await repo.countStudentsInProject(1)).toBe(2);
  });

  it('isStudentInProjectThisYear returns true on conflict', async () => {
    const sql = makeFakeSql([[{ exists: true }]]);
    const repo = new PgProjectStudentRepository(sql);
    expect(await repo.isStudentInProjectThisYear(1, 2)).toBe(true);
  });

  it('isStudentInProjectThisYear returns false without conflict', async () => {
    const sql = makeFakeSql([[{ exists: false }]]);
    const repo = new PgProjectStudentRepository(sql);
    expect(await repo.isStudentInProjectThisYear(1, 2)).toBe(false);
  });

  it('isAssigned returns true when assigned', async () => {
    const sql = makeFakeSql([[{ exists: true }]]);
    const repo = new PgProjectStudentRepository(sql);
    expect(await repo.isAssigned(1, 1)).toBe(true);
  });

  it('isAssigned returns false when not assigned', async () => {
    const sql = makeFakeSql([[{ exists: false }]]);
    const repo = new PgProjectStudentRepository(sql);
    expect(await repo.isAssigned(1, 1)).toBe(false);
  });

  it('assign inserts each student and returns the assignment result', async () => {
    const sql = makeFakeSql([[{}], [{}], [{ count: 2 }]]);
    const repo = new PgProjectStudentRepository(sql);
    const result = await repo.assign(1, [1, 2]);
    expect(result).toEqual({ projectId: 1, assigned: [1, 2], totalStudents: 2 });
  });

  it('assign translates the year-conflict trigger exception to YEAR_CONFLICT', async () => {
    const trigger = new Error('Student 1 already belongs to a project in academic year 2024-2025');
    const sql = makeFakeSql([trigger]);
    const repo = new PgProjectStudentRepository(sql);
    await expect(repo.assign(1, [1])).rejects.toMatchObject({ code: 'YEAR_CONFLICT' });
  });

  it('unassign resolves', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgProjectStudentRepository(sql);
    await expect(repo.unassign(1, 1)).resolves.toBeUndefined();
  });
});
