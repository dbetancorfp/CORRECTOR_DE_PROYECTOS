// sketchNumber: 61

import { describe, it, expect } from 'bun:test';
import type { ProjectService } from '../src/services/project.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-projects-form';
import type { CorrectorProjectsForm } from '../src/components/corrector-projects-form';

function makeProjectService(overrides: Partial<ProjectService> = {}): ProjectService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (data) => ({ ok: true, item: { id: 1, name: data.name, academicYear: data.academicYear, moduleId: data.moduleId, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', academicYear: '2024-2025', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeLegislationService(overrides: Partial<LegislationService> = {}): LegislationService {
  return {
    list: async () => ({ ok: true, items: [{ id: 1, name: 'LOMLOE', startYear: 2020 }] }),
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
    list: async () => ({ ok: true, items: [{ id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' }] }),
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

describe('Element #61 — corrector-projects-form: project name field', () => {
  it('shows an error state when submitted empty', async () => {
    const el = mount(makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const button = el.shadowRoot!.querySelector('[data-element-id="66"]') as HTMLButtonElement;
    button.click();
    await flush();

    const name = el.shadowRoot!.querySelector('[data-element-id="61"]') as HTMLInputElement;
    expect(name.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });

  it('creates a project with a valid cascade, converting the selected year to an academic_year range', async () => {
    let createdAcademicYear: string | null = null;
    const el = mount(
      makeProjectService({ create: async (data) => { createdAcademicYear = data.academicYear; return { ok: true, item: { id: 1, name: data.name, academicYear: data.academicYear, moduleId: data.moduleId, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }; } }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();

    const name = el.shadowRoot!.querySelector('[data-element-id="61"]') as HTMLInputElement;
    name.value = 'Grupo 1';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    const year = el.shadowRoot!.querySelector('[data-element-id="62"]') as HTMLSelectElement;
    year.value = '2020';
    year.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const legislation = el.shadowRoot!.querySelector('[data-element-id="63"]') as HTMLSelectElement;
    legislation.value = '1';
    legislation.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const cycle = el.shadowRoot!.querySelector('[data-element-id="64"]') as HTMLSelectElement;
    cycle.value = '1';
    cycle.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const module = el.shadowRoot!.querySelector('[data-element-id="65"]') as HTMLSelectElement;
    module.value = '1';
    module.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const button = el.shadowRoot!.querySelector('[data-element-id="66"]') as HTMLButtonElement;
    button.click();
    await flush();

    expect(createdAcademicYear).toBe('2020-2021');
    el.remove();
  });
});
