// sketchNumbers: 114, 115, 116, 117, 118

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

const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];
const MODULES = [
  { id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' },
  { id: 2, name: 'RED', weeklyHours: 5, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' },
];

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
    list: async () => ({ ok: true, items: [{ id: 2, username: 'profesor1', role: 'profesor', passwordStatus: 'default', accountLocked: false, failedLoginAttempts: 0, modules: [{ id: 1, name: 'DEW' }] }] }),
    create: async () => ({ ok: false, status: 500, code: '' }),
    update: async () => ({ ok: false, status: 500, code: '' }),
    delete: async () => ({ ok: true }),
    unlock: async () => ({ ok: true, accountLocked: false, failedLoginAttempts: 0 }),
    ...overrides,
  };
}

function makeProjectService(overrides: Partial<ProjectService> = {}): ProjectService {
  return {
    list: async () => ({ ok: true, items: [{ id: 1, name: 'Grupo 1', academicYear: '2020-2021', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 1 }] }),
    create: async (data) => ({ ok: true, item: { id: 1, name: data.name, academicYear: data.academicYear, moduleId: data.moduleId, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', academicYear: '2020-2021', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeLegislationService(overrides: Partial<LegislationService> = {}): LegislationService {
  return {
    list: async () => ({ ok: true, items: LEGISLATIONS }),
    create: async (name, startYear) => ({ ok: true, item: { id: 1, name, startYear } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', startYear: data.startYear ?? 0 } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeCycleService(overrides: Partial<CycleService> = {}): CycleService {
  return {
    list: async () => ({ ok: true, items: [{ id: 1, name: 'DAW' }] }),
    create: async (name) => ({ ok: true, item: { id: 1, name } }),
    update: async (id, name) => ({ ok: true, item: { id, name } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeModuleService(overrides: Partial<ModuleService> = {}): ModuleService {
  return {
    list: async () => ({ ok: true, items: MODULES }),
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

async function selectCascadeUpToCycle(el: CorrectorGradesViewForm): Promise<void> {
  const year = el.shadowRoot!.querySelector('[data-element-id="114"]') as HTMLSelectElement;
  year.value = '2020';
  year.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  const legislation = el.shadowRoot!.querySelector('[data-element-id="115"]') as HTMLSelectElement;
  legislation.value = '1';
  legislation.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  const cycle = el.shadowRoot!.querySelector('[data-element-id="116"]') as HTMLSelectElement;
  cycle.value = '1';
  cycle.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
}

describe('Elements #114-118 — corrector-grades-view-form: cascade', () => {
  it('#115/#116/#117/#118 start disabled and enable as the cascade fills in', async () => {
    const el = mount(makeGradeService(), makeAuthService(), makeTeacherService(), makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="115"]') as HTMLSelectElement).disabled).toBe(true);
    expect((el.shadowRoot!.querySelector('[data-element-id="118"]') as HTMLSelectElement).disabled).toBe(true);

    await selectCascadeUpToCycle(el);

    expect((el.shadowRoot!.querySelector('[data-element-id="117"]') as HTMLSelectElement).disabled).toBe(false);
    el.remove();
  });

  it('for role=profesor, #117 only shows the teacher\'s own assigned module', async () => {
    const el = mount(makeGradeService(), makeAuthService(), makeTeacherService(), makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectCascadeUpToCycle(el);

    const module = el.shadowRoot!.querySelector('[data-element-id="117"]') as HTMLSelectElement;
    const names = Array.from(module.options).filter((o) => o.value !== '').map((o) => o.textContent);
    expect(names).toEqual(['DEW']);
    el.remove();
  });

  it('for role=tutor, #117 shows every module in the cycle', async () => {
    const el = mount(
      makeGradeService(), makeAuthService({ me: async () => ({ ok: true, id: 3, role: 'tutor' }) }),
      makeTeacherService(), makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectCascadeUpToCycle(el);

    const module = el.shadowRoot!.querySelector('[data-element-id="117"]') as HTMLSelectElement;
    const names = Array.from(module.options).filter((o) => o.value !== '').map((o) => o.textContent);
    expect(names).toEqual(['DEW', 'RED']);
    el.remove();
  });

  it('selecting a module loads its projects into #118', async () => {
    const el = mount(makeGradeService(), makeAuthService(), makeTeacherService(), makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectCascadeUpToCycle(el);
    const module = el.shadowRoot!.querySelector('[data-element-id="117"]') as HTMLSelectElement;
    module.value = '1';
    module.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const project = el.shadowRoot!.querySelector('[data-element-id="118"]') as HTMLSelectElement;
    expect(project.disabled).toBe(false);
    const names = Array.from(project.options).filter((o) => o.value !== '').map((o) => o.textContent);
    expect(names).toEqual(['Grupo 1']);
    el.remove();
  });
});
