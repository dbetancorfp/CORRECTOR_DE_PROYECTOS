// Nav/logout/tab-bar chrome — not tied to a single boceto sketchNumber.

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

describe('corrector-projects-form: nav chrome', () => {
  it('dispatches corrector:logout when Salir is clicked', async () => {
    const el = mount(makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    let logoutFired = false;
    document.addEventListener('corrector:logout', () => { logoutFired = true; }, { once: true });

    const button = el.shadowRoot!.querySelector('[data-action="logout"]') as HTMLButtonElement;
    button.click();

    expect(logoutFired).toBe(true);
    el.remove();
  });

  it('renders the Proyectos tab as active, Alumnos/Asignación as enabled and Rúbrica as disabled', async () => {
    const el = mount(makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const proyectos = el.shadowRoot!.querySelector('[data-action="tab-proyectos"]') as HTMLButtonElement;
    expect(proyectos.getAttribute('aria-selected')).toBe('true');

    for (const action of ['tab-alumnos', 'tab-asignacion']) {
      const tab = el.shadowRoot!.querySelector(`[data-action="${action}"]`) as HTMLButtonElement;
      expect(tab.disabled).toBe(false);
    }

    const rubrica = el.shadowRoot!.querySelector('[data-action="tab-rubrica"]') as HTMLButtonElement;
    expect(rubrica.disabled).toBe(true);
    el.remove();
  });

  it('navigates to /profesor/gestionar/alumnos when the Alumnos tab is clicked', async () => {
    const el = mount(makeProjectService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    let navigatedTo: string | null = null;
    el.addEventListener('corrector:gestion-nav-selected', (e) => {
      navigatedTo = (e as CustomEvent<{ to: string }>).detail.to;
    });

    const alumnos = el.shadowRoot!.querySelector('[data-action="tab-alumnos"]') as HTMLButtonElement;
    alumnos.click();

    expect(navigatedTo).toBe('/profesor/gestionar/alumnos');
    el.remove();
  });
});
