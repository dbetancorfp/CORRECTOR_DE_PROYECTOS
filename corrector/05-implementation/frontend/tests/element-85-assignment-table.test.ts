// sketchNumber: 85

import { describe, it, expect } from 'bun:test';
import type { ProjectService } from '../src/services/project.service';
import type { StudentService } from '../src/services/student.service';
import type { ProjectStudentService } from '../src/services/project-student.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-assignment-form';
import type { CorrectorAssignmentForm } from '../src/components/corrector-assignment-form';

const PROJECTS = [
  { id: 1, name: 'Grupo 1', academicYear: '2020-2021', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 },
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
    list: async () => ({ ok: true, items: [] }),
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

describe('Element #85 — corrector-assignment-form: projects table', () => {
  it('shows an empty state when there are no projects', async () => {
    const el = mount(makeProjectService({ list: async () => ({ ok: true, items: [] }) }), makeStudentService(), makeProjectStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect(el.shadowRoot!.textContent).toContain('No hay proyectos registrados');
    el.remove();
  });

  it('edits a project inline without triggering row selection, and persists the new name', async () => {
    let updated: { id: number; name?: string } | null = null;
    const el = mount(
      makeProjectService({ update: async (id, data) => { updated = { id, name: data.name }; return { ok: true, item: { id, name: data.name ?? '', academicYear: '2020-2021', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }; } }),
      makeStudentService(), makeProjectStudentService(), makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();

    const editButton = el.shadowRoot!.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editButton.click();
    await flush();

    const panel = el.shadowRoot!.querySelector('[data-element-id="83"]') as HTMLElement;
    expect(panel.textContent).not.toContain('Grupo 1');

    const input = el.shadowRoot!.querySelector('tbody input') as HTMLInputElement;
    input.value = 'Editado';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    const saveButton = el.shadowRoot!.querySelector('[data-action="save"]') as HTMLButtonElement;
    saveButton.click();
    await flush();

    expect(updated).toEqual({ id: 1, name: 'Editado' });
    el.remove();
  });

  it('deletes a project after confirmation without triggering row selection', async () => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    let deletedId: number | null = null;
    const el = mount(
      makeProjectService({ delete: async (id) => { deletedId = id; return { ok: true }; } }),
      makeStudentService(), makeProjectStudentService(), makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(deletedId).toBe(1);
    const panel = el.shadowRoot!.querySelector('[data-element-id="83"]') as HTMLElement;
    expect(panel.textContent).not.toContain('Grupo 1');
    window.confirm = originalConfirm;
    el.remove();
  });
});
