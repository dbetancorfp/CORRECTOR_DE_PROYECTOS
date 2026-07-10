// Infrastructure module — not tied to a boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import { PgCorrectionRepository } from '../src/repositories/postgres/pg-correction.repository';
import { makeFakeSql } from './helpers/fake-sql';

const CORRECTION_ROW = {
  id: 1,
  studentId: 1,
  projectId: 1,
  moduleId: 1,
  rubricId: 1,
  academicYear: '2024-2025',
  finalScore: 8.5,
  items: [{ rubricItemId: 1, rubricLevelId: 1 }],
};

describe('PgCorrectionRepository', () => {
  it('findAll returns mapped rows', async () => {
    const sql = makeFakeSql([[CORRECTION_ROW]]);
    const repo = new PgCorrectionRepository(sql);
    expect(await repo.findAll()).toEqual([CORRECTION_ROW]);
    expect(sql.calls.length).toBe(1);
  });

  it('findByStudentAndProject returns the row when found', async () => {
    const sql = makeFakeSql([[CORRECTION_ROW]]);
    const repo = new PgCorrectionRepository(sql);
    expect(await repo.findByStudentAndProject(1, 1)).toEqual(CORRECTION_ROW);
  });

  it('findByStudentAndProject returns null when not found', async () => {
    const sql = makeFakeSql([[]]);
    const repo = new PgCorrectionRepository(sql);
    expect(await repo.findByStudentAndProject(1, 999)).toBeNull();
  });

  it('upsert writes the correction + item breakdown atomically and returns the result', async () => {
    const sql = makeFakeSql([[{ id: 1 }], [{}], [{}]]);
    const repo = new PgCorrectionRepository(sql);
    const result = await repo.upsert({
      studentId: 1,
      projectId: 1,
      moduleId: 1,
      rubricId: 1,
      teacherId: 7,
      academicYear: '2024-2025',
      items: [{ rubricItemId: 1, rubricLevelId: 1 }],
      finalScore: 8.5,
    });
    expect(result).toEqual(CORRECTION_ROW);
    expect(sql.calls.length).toBe(3);
  });

  it('upsert defaults finalScore to 0 when omitted', async () => {
    const sql = makeFakeSql([[{ id: 1 }], [{}]]);
    const repo = new PgCorrectionRepository(sql);
    const result = await repo.upsert({
      studentId: 1,
      projectId: 1,
      moduleId: 1,
      rubricId: 1,
      teacherId: 7,
      academicYear: '2024-2025',
      items: [],
    });
    expect(result.finalScore).toBe(0);
    expect(result.items).toEqual([]);
  });
});
