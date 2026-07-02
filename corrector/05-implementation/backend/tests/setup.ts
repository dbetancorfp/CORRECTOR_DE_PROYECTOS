import { createStore } from '../src/repositories/in-memory/store';
import { createApp } from '../src/app';

const store = createStore();

// nextId counters start at 100 to avoid clashing with seeded IDs
for (const key of Object.keys(store.nextId)) {
  store.nextId[key] = 100;
}

const adminHash = await Bun.password.hash('Admin1234!', { algorithm: 'bcrypt', cost: 10 });
const defaultHash = await Bun.password.hash('12345678', { algorithm: 'bcrypt', cost: 10 });
const tutorHash = await Bun.password.hash('correctpass', { algorithm: 'bcrypt', cost: 10 });

// Legislations
store.legislations = [
  { id: 1, name: 'LOGSE', startYear: 1990 },
  { id: 2, name: 'LOMLOE', startYear: 2020 },
];

// Cycles (Cycle type: {id, name} only)
store.cycles = [
  { id: 1, name: 'DAW' },
  { id: 2, name: 'ASIR' },
  { id: 3, name: 'ExistingCycle' },
];

// Modules
store.modules = [
  { id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 2, legislationName: 'LOMLOE' },
  { id: 2, name: 'ANA', weeklyHours: 5, cycleId: 1, cycleName: 'DAW', legislationId: 2, legislationName: 'LOMLOE' },
];

// Teachers
store.teachers = [
  { id: 1, username: 'admin', role: 'admin', passwordHash: adminHash, mustChangePassword: false, passwordStatus: 'changed', accountLocked: false, failedLoginAttempts: 0, tutorOfCycleId: null, modules: [] },
  { id: 2, username: 'profesor1', role: 'profesor', passwordHash: defaultHash, mustChangePassword: true, passwordStatus: 'default', accountLocked: false, failedLoginAttempts: 0, tutorOfCycleId: null, modules: [] },
  { id: 3, username: 'dbetqui', role: 'tutor', passwordHash: tutorHash, mustChangePassword: false, passwordStatus: 'changed', accountLocked: false, failedLoginAttempts: 0, tutorOfCycleId: 1, modules: [] },
  { id: 4, username: 'dbetotro', role: 'profesor', passwordHash: defaultHash, mustChangePassword: true, passwordStatus: 'default', accountLocked: false, failedLoginAttempts: 0, tutorOfCycleId: null, modules: [] },
  { id: 5, username: 'otroprofe', role: 'profesor', passwordHash: defaultHash, mustChangePassword: true, passwordStatus: 'default', accountLocked: false, failedLoginAttempts: 0, tutorOfCycleId: null, modules: [] },
  { id: 6, username: 'lockedteacher', role: 'profesor', passwordHash: defaultHash, mustChangePassword: true, passwordStatus: 'default', accountLocked: false, failedLoginAttempts: 0, tutorOfCycleId: null, modules: [] },
];

store.moduleTeachers = [
  { moduleId: 1, teacherId: 2 },
  { moduleId: 1, teacherId: 3 },
  { moduleId: 2, teacherId: 4 },
];

// Students
store.students = [
  { id: 1, name: 'JJ499', cycleId: 1, cycleName: 'DAW', modules: [] },
  { id: 2, name: 'MnP454', cycleId: 1, cycleName: 'DAW', modules: [] },
];

// Projects (project 1 has moduleId=2 so module 1 has no projects → DELETE module 1 → 204)
store.projects = [
  { id: 1, name: 'Test Project', academicYear: '2024-2025', moduleId: 2, moduleName: 'ANA', cycleName: 'DAW', studentCount: 0 },
  { id: 2, name: 'Project B', academicYear: '2024-2025', moduleId: 2, moduleName: 'ANA', cycleName: 'DAW', studentCount: 0 },
];

store.projectStudents = [];

// Rubric for module 1 (Excelente sum = 6.0 so adding Excelente=2.0 is within limit)
store.rubrics = [
  { id: 1, moduleId: 1, academicYear: '2024-2025', frozen: false, items: [] },
];

store.rubricItems = [
  {
    id: 1, rubricId: 1, description: 'Presentación', displayOrder: 1,
    levels: [
      { id: 1, name: 'Excelente', score: 3.0, displayOrder: 1 },
      { id: 2, name: 'Bien', score: 1.5, displayOrder: 2 },
      { id: 3, name: 'Mal', score: 0.0, displayOrder: 3 },
    ],
  },
  {
    id: 2, rubricId: 1, description: 'Código', displayOrder: 2,
    levels: [
      { id: 4, name: 'Excelente', score: 3.0, displayOrder: 1 },
      { id: 5, name: 'Bien', score: 1.5, displayOrder: 2 },
      { id: 6, name: 'Mal', score: 0.0, displayOrder: 3 },
    ],
  },
];

// Pre-seeded sessions for integration tests
const futureExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
store.sessions.set('tutor-session', { teacherId: 3, expiresAt: futureExpiry });
store.sessions.set('profesor-session', { teacherId: 2, expiresAt: futureExpiry });
store.sessions.set('other-teacher-session', { teacherId: 5, expiresAt: futureExpiry });

const app = createApp(store);
app.listen(3456);
