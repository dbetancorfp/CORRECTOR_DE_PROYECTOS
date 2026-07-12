// Nav/logout chrome — not tied to a single boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import type { GradeService } from '../src/services/grade.service';
import type { AuthService } from '../src/services/auth.service';
import type { TeacherService } from '../src/services/teacher.service';
import type { ProjectService } from '../src/services/project.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-grades-view-form';
import type { CorrectorGradesViewForm } from '../src/components/corrector-grades-view-form';

function makeGradeService(overrides: Partial<GradeService> = {}): GradeService {
  return {
    getModuleGrades: async () => ({ ok: true, items: [] }),
    getCycleGrades: async () => ({ ok: true, item: { modules: [], grades: [] } }),
    getCorrectionStatus: async () => ({ ok: true, items: [] }),
    downloadPdf: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    login: async () => ({ ok: true, role: 'profesor', mustChangePassword: false }),
    changePassword: async () => ({ ok: true }),
    logout: async () => ({ ok: true }),
    me: async () => ({ ok: true, id: 2, role: 'profesor' }),
    ...overrides,
  };
}

function makeTeacherService(overrides: Partial<TeacherService> = {}): TeacherService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async () => ({ ok: false, status: 500, code: '' }),
    update: async () => ({ ok: false, status: 500, code: '' }),
    delete: async () => ({ ok: true }),
    unlock: async () => ({ ok: true, accountLocked: false, failedLoginAttempts: 0 }),
    ...overrides,
  };
}

function makeProjectService(overrides: Partial<ProjectService> = {}): ProjectService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (data) => ({ ok: true, item: { id: 1, name: data.name, academicYear: data.academicYear, moduleId: data.moduleId, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', academicYear: '2020-2021', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeLegislationService(overrides: Partial<LegislationService> = {}): LegislationService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (name, startYear) => ({ ok: true, item: { id: 1, name, startYear } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', startYear: data.startYear ?? 0 } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeCycleService(overrides: Partial<CycleService> = {}): CycleService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (name) => ({ ok: true, item: { id: 1, name } }),
    update: async (id, name) => ({ ok: true, item: { id, name } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeModuleService(overrides: Partial<ModuleService> = {}): ModuleService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (data) => ({ ok: true, item: { id: 1, ...data, cycleName: '', legislationName: '' } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', weeklyHours: data.weeklyHours ?? 0, cycleId: data.cycleId ?? 0, cycleName: '', legislationId: data.legislationId ?? 0, legislationName: '' } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function mount(
  gradeService: GradeService,
  authService: AuthService,
  teacherService: TeacherService,
  projectService: ProjectService,
  legislationService: LegislationService,
  cycleService: CycleService,
  moduleService: ModuleService,
): CorrectorGradesViewForm {
  const el = document.createElement('corrector-grades-view-form') as CorrectorGradesViewForm;
  el.gradeService = gradeService;
  el.authService = authService;
  el.teacherService = teacherService;
  el.projectService = projectService;
  el.legislationService = legislationService;
  el.cycleService = cycleService;
  el.moduleService = moduleService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('corrector-grades-view-form: nav chrome', () => {
  it('dispatches corrector:logout when Salir is clicked', async () => {
    const el = mount(makeGradeService(), makeAuthService(), makeTeacherService(), makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    let logoutFired = false;
    document.addEventListener('corrector:logout', () => { logoutFired = true; }, { once: true });

    const button = el.shadowRoot!.querySelector('[data-action="logout"]') as HTMLButtonElement;
    button.click();

    expect(logoutFired).toBe(true);
    el.remove();
  });
});
