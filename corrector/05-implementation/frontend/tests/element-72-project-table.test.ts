// sketchNumber: 72

import { describe, it, expect } from 'bun:test';
import type { ProjectService } from '../src/services/project.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-projects-form';
import type { CorrectorProjectsForm } from '../src/components/corrector-projects-form';

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
  legislationService: LegislationService,
  cycleService: CycleService,
  moduleService: ModuleService,
): CorrectorProjectsForm {
  const el = document.createElement('corrector-projects-form') as CorrectorProjectsForm;
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

describe('Element #72 — corrector-projects-form: projects table', () => {
  it('shows an empty state when there are no projects', async () => {
    const el = mount(makeProjectService({ list: async () => ({ ok: true, items: [] }) }), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect(el.shadowRoot!.textContent).toContain('No hay proyectos registrados');
    el.remove();
  });

  it('edits a project inline and persists the new name', async () => {
    let updated: { id: number; name?: string } | null = null;
    const el = mount(
      makeProjectService({ update: async (id, data) => { updated = { id, name: data.name }; return { ok: true, item: { id, name: data.name ?? '', academicYear: '2020-2021', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }; } }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();

    const editButton = el.shadowRoot!.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editButton.click();
    await flush();

    const input = el.shadowRoot!.querySelector('tbody input') as HTMLInputElement;
    input.value = 'Editado';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const saveButton = el.shadowRoot!.querySelector('[data-action="save"]') as HTMLButtonElement;
    saveButton.click();
    await flush();

    expect(updated).toEqual({ id: 1, name: 'Editado' });
    el.remove();
  });

  it('deletes a project after confirmation', async () => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    let deletedId: number | null = null;
    const el = mount(
      makeProjectService({ delete: async (id) => { deletedId = id; return { ok: true }; } }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(deletedId).toBe(1);
    window.confirm = originalConfirm;
    el.remove();
  });

  it('shows a blocked error message when deleting a project with assigned students', async () => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    const el = mount(
      makeProjectService({ delete: async () => ({ ok: false, status: 409, code: 'HAS_DEPENDANTS' }) }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(el.shadowRoot!.textContent).toContain('alumnos asignados');
    window.confirm = originalConfirm;
    el.remove();
  });
});
