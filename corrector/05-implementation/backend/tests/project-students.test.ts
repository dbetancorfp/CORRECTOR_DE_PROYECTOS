// sketchNumbers: 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 121
// UC-07b: Asignación Proyecto-Alumno

import { describe, it, expect } from 'bun:test';
import { ProjectStudentService } from '../src/services/project-student.service';
import type { ProjectStudentRepository } from '../src/repositories/project-student.repository';

const BASE_URL = 'http://localhost:3456';

// ── Domain doubles ────────────────────────────────────────────────────────────

const baseAssignment = {
  projectId: 1,
  projectName: 'App inventario',
  studentId: 1,
  studentName: 'JJ499',
  moduleName: 'DEW',
};

function makeRepo(overrides: Partial<ProjectStudentRepository> = {}): ProjectStudentRepository {
  return {
    findByProject: async () => [{ studentId: 1, name: 'JJ499' }],
    findAll: async () => [baseAssignment],
    countStudentsInProject: async () => 1,
    isStudentInProjectThisYear: async () => false,
    assign: async () => ({ projectId: 1, assigned: [1], totalStudents: 1 }),
    unassign: async () => {},
    ...overrides,
  };
}

// ── Element #83 — Selected project panel ─────────────────────────────────────

describe('Element #83 — ProjectStudentService: findByProject', () => {
  it('returns students assigned to a project', async () => {
    const service = new ProjectStudentService(makeRepo());
    const students = await service.getStudentsForProject(1);
    expect(students.length).toBeGreaterThan(0);
    expect(students[0].studentId).toBe(1);
  });

  it('returns empty array when project has no students', async () => {
    const repo = makeRepo({ findByProject: async () => [] });
    const service = new ProjectStudentService(repo);
    const students = await service.getStudentsForProject(99);
    expect(students).toHaveLength(0);
  });
});

// ── Element #121 — Agregar alumnos: business rules ───────────────────────────

describe('Element #121 — ProjectStudentService: assign (max 3 students per project)', () => {
  it('assigns a student to a project successfully', async () => {
    let assigned = false;
    const repo = makeRepo({ assign: async () => { assigned = true; return { projectId: 1, assigned: [2], totalStudents: 2 }; } });
    const service = new ProjectStudentService(repo);
    await service.assign(1, [2]);
    expect(assigned).toBe(true);
  });

  it('throws LIMIT_EXCEEDED when assignment would exceed 3 students', async () => {
    const repo = makeRepo({ countStudentsInProject: async () => 3 });
    const service = new ProjectStudentService(repo);
    await expect(service.assign(1, [4])).rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });
  });

  it('throws LIMIT_EXCEEDED when batch assignment would push total beyond 3', async () => {
    const repo = makeRepo({ countStudentsInProject: async () => 2 });
    const service = new ProjectStudentService(repo);
    // Trying to add 2 more when 2 already exist (total would be 4)
    await expect(service.assign(1, [4, 5])).rejects.toMatchObject({ code: 'LIMIT_EXCEEDED' });
  });

  it('throws YEAR_CONFLICT when student is already in another project this academic year', async () => {
    const repo = makeRepo({ isStudentInProjectThisYear: async () => true });
    const service = new ProjectStudentService(repo);
    await expect(service.assign(1, [2])).rejects.toMatchObject({ code: 'YEAR_CONFLICT' });
  });
});

describe('Element #85 — ProjectStudentService: unassign', () => {
  it('removes the student-project assignment', async () => {
    let unassigned = false;
    const repo = makeRepo({ unassign: async () => { unassigned = true; } });
    const service = new ProjectStudentService(repo);
    await service.unassign(1, 1);
    expect(unassigned).toBe(true);
  });
});

// ── API integration tests ─────────────────────────────────────────────────────

describe('Element #85 — GET /api/projects/:id/students', () => {
  it('returns 200 with list of assigned students', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1/students`);
    expect(res.status).toBe(200);
    expect(Array.isArray(await res.json())).toBe(true);
  });
});

describe('Element #121 — POST /api/projects/:id/students', () => {
  it('returns 201 with assigned student ids and total count', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: [2] }),
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { projectId: number; assigned: number[]; totalStudents: number };
    expect(body.projectId).toBe(1);
    expect(Array.isArray(body.assigned)).toBe(true);
    expect(body.totalStudents).toBeDefined();
  });

  it('returns 400 when studentIds is empty', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: [] }),
    });
    expect(res.status).toBe(400);
  });

  it('returns 409 when assignment would exceed 3 students', async () => {
    // First assign 3 students, then try to add a 4th
    const assign = (ids: number[]) => fetch(`${BASE_URL}/api/projects/1/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: ids }),
    });
    await assign([1]);
    await assign([2]);
    await assign([3]);
    const res = await assign([4]);
    expect(res.status).toBe(409);
  });

  it('returns 409 when student is already in another project this year', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/2/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds: [1] }), // student 1 already in project 1
    });
    expect(res.status).toBe(409);
  });
});

describe('Element #85 — DELETE /api/projects/:pId/students/:sId', () => {
  it('returns 204 when unassignment succeeds', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1/students/1`, { method: 'DELETE' });
    expect(res.status).toBe(204);
  });

  it('returns 404 when assignment does not exist', async () => {
    const res = await fetch(`${BASE_URL}/api/projects/1/students/99999`, { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
