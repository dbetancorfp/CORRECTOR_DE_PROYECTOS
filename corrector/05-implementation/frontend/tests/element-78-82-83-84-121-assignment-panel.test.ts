// sketchNumbers: 78, 79, 80, 81, 82, 83, 84, 121

import { describe, it, expect } from 'bun:test';
import type { ProjectService } from '../src/services/project.service';
import type { StudentService } from '../src/services/student.service';
import type { ProjectStudentService } from '../src/services/project-student.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-assignment-form';
import type { CorrectorAssignmentForm } from '../src/components/corrector-assignment-form';

const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];
const MODULES = [{ id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' }];
const PROJECTS = [
  { id: 1, name: 'Grupo 1', academicYear: '2020-2021', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 },
];
const STUDENTS = [
  { id: 10, name: 'JJ499', cycleId: 1, cycleName: 'DAW', modules: [{ id: 1, name: 'DEW' }] },
  { id: 11, name: 'MnP454', cycleId: 1, cycleName: 'DAW', modules: [{ id: 1, name: 'DEW' }] },
];

function makeProjectService(overrides: Partial<ProjectService> = {}): ProjectService {
  return {
    list: async () => ({ ok: true, items: PROJECTS }),
    create: async (data) => ({ ok: true, item: { id: 1, name: data.name, academicYear: data.academicYear, moduleId: data.moduleId, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', academicYear: '2020-2021', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeStudentService(overrides: Partial<StudentService> = {}): StudentService {
  return {
    list: async () => ({ ok: true, items: STUDENTS }),
    create: async () => ({ ok: true, item: { id: 1, name: 'Nuevo', cycleId: 1, cycleName: 'DAW', modules: [] } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', cycleId: 1, cycleName: 'DAW', modules: [] } }),
    delete: async () => ({ ok: true }),
    upload: async () => ({ ok: true, created: 0 }),
    ...overrides,
  };
}

function makeProjectStudentService(overrides: Partial<ProjectStudentService> = {}): ProjectStudentService {
  return {
    listForProject: async () => ({ ok: true, items: [] }),
    assign: async () => ({ ok: true, projectId: 1, assigned: [], totalStudents: 0 }),
    unassign: async () => ({ ok: true }),
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
  projectService: ProjectService,
  studentService: StudentService,
  projectStudentService: ProjectStudentService,
  legislationService: LegislationService,
  cycleService: CycleService,
  moduleService: ModuleService,
): CorrectorAssignmentForm {
  const el = document.createElement('corrector-assignment-form') as CorrectorAssignmentForm;
  el.projectService = projectService;
  el.studentService = studentService;
  el.projectStudentService = projectStudentService;
  el.legislationService = legislationService;
  el.cycleService = cycleService;
  el.moduleService = moduleService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function selectProject(el: CorrectorAssignmentForm): Promise<void> {
  const row = el.shadowRoot!.querySelector('[data-element-id="85"] tbody tr') as HTMLTableRowElement;
  row.click();
  await flush();
}

describe('Elements #83/#84/#121 — corrector-assignment-form: selection panel', () => {
  it('#83 shows an empty state and #121 is disabled when no project is selected', async () => {
    const el = mount(makeProjectService(), makeStudentService(), makeProjectStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const panel = el.shadowRoot!.querySelector('[data-element-id="83"]') as HTMLElement;
    expect(panel.textContent).not.toContain('Grupo 1');
    const button = el.shadowRoot!.querySelector('[data-element-id="121"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    el.remove();
  });

  it('clicking a row in #85 updates #83 with the project name and loads candidates in #84', async () => {
    const el = mount(makeProjectService(), makeStudentService(), makeProjectStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectProject(el);

    const panel = el.shadowRoot!.querySelector('[data-element-id="83"]') as HTMLElement;
    expect(panel.textContent).toContain('Grupo 1');
    const candidates = el.shadowRoot!.querySelector('[data-element-id="84"]') as HTMLElement;
    expect(candidates.textContent).toContain('JJ499');
    expect(candidates.textContent).toContain('MnP454');
    el.remove();
  });

  it('excludes already-assigned students from the candidate pool and lists them with a Quitar button', async () => {
    const el = mount(
      makeProjectService(), makeStudentService(),
      makeProjectStudentService({ listForProject: async () => ({ ok: true, items: [{ studentId: 10, name: 'JJ499' }] }) }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectProject(el);

    const candidates = el.shadowRoot!.querySelector('[data-element-id="84"]') as HTMLElement;
    const checkboxes = candidates.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(1);
    expect(candidates.textContent).toContain('JJ499');
    expect(candidates.querySelector('[data-action="unassign"]')).not.toBeNull();
    el.remove();
  });

  it('#121 enables once a project and at least one candidate are selected, and assigns on click', async () => {
    let assignedIds: number[] = [];
    const el = mount(
      makeProjectService(), makeStudentService(),
      makeProjectStudentService({ assign: async (projectId, studentIds) => { assignedIds = studentIds; return { ok: true, projectId, assigned: studentIds, totalStudents: studentIds.length }; } }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectProject(el);

    const button = el.shadowRoot!.querySelector('[data-element-id="121"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    const checkbox = el.shadowRoot!.querySelector('[data-element-id="84"] input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));

    expect(button.disabled).toBe(false);
    button.click();
    await flush();

    expect(assignedIds).toEqual([10]);
    el.remove();
  });

  it('shows a blocked error when the assignment would exceed 3 students', async () => {
    const el = mount(
      makeProjectService(), makeStudentService(),
      makeProjectStudentService({ assign: async () => ({ ok: false, status: 409, code: 'LIMIT_EXCEEDED' }) }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectProject(el);

    const checkbox = el.shadowRoot!.querySelector('[data-element-id="84"] input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    const button = el.shadowRoot!.querySelector('[data-element-id="121"]') as HTMLButtonElement;
    button.click();
    await flush();

    expect(el.shadowRoot!.textContent).toContain('máximo de 3 alumnos');
    el.remove();
  });

  it('shows a blocked error when a student is already assigned to another project this year', async () => {
    const el = mount(
      makeProjectService(), makeStudentService(),
      makeProjectStudentService({ assign: async () => ({ ok: false, status: 409, code: 'YEAR_CONFLICT' }) }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectProject(el);

    const checkbox = el.shadowRoot!.querySelector('[data-element-id="84"] input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    const button = el.shadowRoot!.querySelector('[data-element-id="121"]') as HTMLButtonElement;
    button.click();
    await flush();

    expect(el.shadowRoot!.textContent).toContain('otro proyecto');
    el.remove();
  });

  it('unassigns a student when Quitar is clicked', async () => {
    let unassigned: { projectId: number; studentId: number } | null = null;
    const el = mount(
      makeProjectService(), makeStudentService(),
      makeProjectStudentService({
        listForProject: async () => ({ ok: true, items: [{ studentId: 10, name: 'JJ499' }] }),
        unassign: async (projectId, studentId) => { unassigned = { projectId, studentId }; return { ok: true }; },
      }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectProject(el);

    const unassignButton = el.shadowRoot!.querySelector('[data-element-id="84"] [data-action="unassign"]') as HTMLButtonElement;
    unassignButton.click();
    await flush();

    expect(unassigned).toEqual({ projectId: 1, studentId: 10 });
    el.remove();
  });

  it('#78 filters the candidate pool by name', async () => {
    const el = mount(makeProjectService(), makeStudentService(), makeProjectStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectProject(el);

    const filter = el.shadowRoot!.querySelector('[data-element-id="78"]') as HTMLInputElement;
    filter.value = 'JJ499';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 350));

    const candidates = el.shadowRoot!.querySelector('[data-element-id="84"]') as HTMLElement;
    expect(candidates.textContent).toContain('JJ499');
    expect(candidates.textContent).not.toContain('MnP454');
    el.remove();
  });

  it('#81 is disabled until #80 has a value', async () => {
    const el = mount(makeProjectService(), makeStudentService(), makeProjectStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="81"]') as HTMLSelectElement).disabled).toBe(true);
    el.remove();
  });
});
