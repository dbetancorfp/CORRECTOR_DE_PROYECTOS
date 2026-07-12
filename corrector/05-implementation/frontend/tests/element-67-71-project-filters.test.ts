// sketchNumbers: 67, 68, 69, 70, 71

import { describe, it, expect } from 'bun:test';
import type { ProjectService } from '../src/services/project.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-projects-form';
import type { CorrectorProjectsForm } from '../src/components/corrector-projects-form';

const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];
const MODULES = [{ id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' }];
const PROJECTS = [
  { id: 1, name: 'Grupo 1', academicYear: '2020-2021', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 },
  { id: 2, name: 'Grupo 2', academicYear: '2020-2021', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 },
];

function makeProjectService(overrides: Partial<ProjectService> = {}): ProjectService {
  return {
    list: async () => ({ ok: true, items: PROJECTS }),
    create: async (data) => ({ ok: true, item: { id: 1, name: data.name, academicYear: data.academicYear, moduleId: data.moduleId, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', academicYear: '2024-2025', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
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

describe('Elements #67–#71 — corrector-projects-form: reactive filters', () => {
  it('#67 filters the table by name with a 300ms debounce', async () => {
    const el = mount(makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const filter = el.shadowRoot!.querySelector('[data-element-id="67"]') as HTMLInputElement;
    filter.value = 'Grupo 1';
    filter.dispatchEvent(new Event('input', { bubbles: true }));

    const table = el.shadowRoot!.querySelector('[data-element-id="72"]') as HTMLTableElement;
    expect(table.textContent).toContain('Grupo 2');

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(table.textContent).toContain('Grupo 1');
    expect(table.textContent).not.toContain('Grupo 2');
    el.remove();
  });

  it('#70 is disabled until #69 has a value', async () => {
    const el = mount(makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="70"]') as HTMLSelectElement).disabled).toBe(true);
    el.remove();
  });

  it('#71 is disabled until #70 has a value', async () => {
    const el = mount(makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="71"]') as HTMLSelectElement).disabled).toBe(true);
    el.remove();
  });

  it('given empty filters, all rows are shown', async () => {
    const el = mount(makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="72"]') as HTMLTableElement;
    expect(table.textContent).toContain('Grupo 1');
    expect(table.textContent).toContain('Grupo 2');
    el.remove();
  });
});
