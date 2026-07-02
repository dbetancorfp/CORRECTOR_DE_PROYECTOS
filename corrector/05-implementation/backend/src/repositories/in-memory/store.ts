// Shared in-memory store for the test server — all entities live here
import type { AuthTeacher, TeacherListItem } from '../teacher.repository';
import type { Session } from '../session.repository';
import type { Legislation } from '../legislation.repository';
import type { Cycle } from '../cycle.repository';
import type { Module } from '../module.repository';
import type { Student } from '../student.repository';
import type { Project } from '../project.repository';
import type { RubricFull, RubricItemFull } from '../rubric.repository';
import type { CorrectionResult } from '../correction.repository';

export interface TeacherFull extends AuthTeacher, TeacherListItem {
  tutorOfCycleId: number | null;
}

export interface ProjectStudentRow {
  projectId: number;
  studentId: number;
}

export interface Store {
  teachers: TeacherFull[];
  sessions: Map<string, { teacherId: number; expiresAt: Date }>;
  legislations: Legislation[];
  cycles: Cycle[];
  modules: Module[];
  moduleTeachers: Array<{ moduleId: number; teacherId: number }>;
  students: Student[];
  projects: Project[];
  projectStudents: ProjectStudentRow[];
  rubrics: RubricFull[];
  rubricItems: RubricItemFull[];
  corrections: CorrectionResult[];
  nextId: { [entity: string]: number };
}

export function createStore(): Store {
  const store: Store = {
    teachers: [],
    sessions: new Map(),
    legislations: [],
    cycles: [],
    modules: [],
    moduleTeachers: [],
    students: [],
    projects: [],
    projectStudents: [],
    rubrics: [],
    rubricItems: [],
    corrections: [],
    nextId: {
      teacher: 10,
      legislation: 10,
      cycle: 10,
      module: 10,
      student: 10,
      project: 10,
      rubric: 10,
      rubricItem: 10,
      rubricLevel: 10,
      correction: 10,
    },
  };

  return store;
}

export function nextId(store: Store, entity: string): number {
  const id = store.nextId[entity] ?? 1;
  store.nextId[entity] = id + 1;
  return id;
}
