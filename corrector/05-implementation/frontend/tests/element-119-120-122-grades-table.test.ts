// sketchNumbers: 119, 120, 122

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
const MODULES = [{ id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' }];
const PROJECTS = [{ id: 1, name: 'Grupo 1', academicYear: '2020-2021', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 1 }];

function makeGradeService(overrides: Partial<GradeService> = {}): GradeService {
  return {
    getModuleGrades: async () => ({ ok: true, items: [{ studentName: 'JJ499', projectName: 'Grupo 1', moduleScore: 8.5 }] }),
    getCycleGrades: async () => ({ ok: true, item: { modules: [{ id: 1, name: 'DEW', weeklyHours: 7 }], grades: [{ studentName: 'JJ499', projectName: 'Grupo 1', moduleScores: { '1': 8.5 }, finalScore: 8.5 }] } }),
    getCorrectionStatus: async () => ({ ok: true, items: [{ moduleId: 1, moduleName: 'Desarrollo (DEW)', totalStudents: 2, correctedStudents: 2, status: 'complete' }] }),
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
    list: async () => ({ ok: true, items: PROJECTS }),
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

async function selectUpToModule(el: CorrectorGradesViewForm): Promise<void> {
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
  const module = el.shadowRoot!.querySelector('[data-element-id="117"]') as HTMLSelectElement;
  module.value = '1';
  module.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
}

describe('Elements #119/#120/#122 — corrector-grades-view-form: table, print and status', () => {
  it('#122 renders a green badge for a module with all corrections complete', async () => {
    const el = mount(makeGradeService(), makeAuthService(), makeTeacherService(), makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
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

    const badges = el.shadowRoot!.querySelector('[data-element-id="122"]') as HTMLElement;
    const badge = badges.querySelector('span')!;
    expect(badge.textContent?.trim()).toBe('DEW');
    expect(badge.getAttribute('data-status')).toBe('complete');
    el.remove();
  });

  it('#122 renders a red badge when at least one correction is missing', async () => {
    const el = mount(
      makeGradeService({ getCorrectionStatus: async () => ({ ok: true, items: [{ moduleId: 1, moduleName: 'Desarrollo (DEW)', totalStudents: 2, correctedStudents: 1, status: 'incomplete' }] }) }),
      makeAuthService(), makeTeacherService(), makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
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

    const badge = (el.shadowRoot!.querySelector('[data-element-id="122"]') as HTMLElement).querySelector('span')!;
    expect(badge.getAttribute('data-status')).toBe('incomplete');
    el.remove();
  });

  it('for role=profesor, #119 shows project/student/nota columns', async () => {
    const el = mount(makeGradeService(), makeAuthService(), makeTeacherService(), makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectUpToModule(el);

    const table = el.shadowRoot!.querySelector('[data-element-id="119"]') as HTMLTableElement;
    expect(table.textContent).toContain('JJ499');
    expect(table.textContent).toContain('8.5');
    expect(table.textContent).not.toContain('Nota final');
    el.remove();
  });

  it('for role=tutor, #119 shows one column per module plus nota final', async () => {
    const el = mount(
      makeGradeService(), makeAuthService({ me: async () => ({ ok: true, id: 3, role: 'tutor' }) }),
      makeTeacherService(), makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectUpToModule(el);

    const table = el.shadowRoot!.querySelector('[data-element-id="119"]') as HTMLTableElement;
    expect(table.textContent).toContain('Nota final');
    expect(table.textContent).toContain('JJ499');
    el.remove();
  });

  it('#120 is disabled until all five cascade selects have a value', async () => {
    const el = mount(makeGradeService(), makeAuthService(), makeTeacherService(), makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectUpToModule(el);

    const print = el.shadowRoot!.querySelector('[data-element-id="120"]') as HTMLButtonElement;
    expect(print.disabled).toBe(true);

    const project = el.shadowRoot!.querySelector('[data-element-id="118"]') as HTMLSelectElement;
    project.value = '1';
    project.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect(print.disabled).toBe(false);
    el.remove();
  });

  it('#120 downloads the PDF for the selected project when clicked', async () => {
    let downloadedProjectId: number | null = null;
    const el = mount(
      makeGradeService({ downloadPdf: async (projectId) => { downloadedProjectId = projectId; return { ok: true }; } }),
      makeAuthService(), makeTeacherService(), makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectUpToModule(el);
    const project = el.shadowRoot!.querySelector('[data-element-id="118"]') as HTMLSelectElement;
    project.value = '1';
    project.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const print = el.shadowRoot!.querySelector('[data-element-id="120"]') as HTMLButtonElement;
    print.click();
    await flush();

    expect(downloadedProjectId).toBe(1);
    el.remove();
  });
});
