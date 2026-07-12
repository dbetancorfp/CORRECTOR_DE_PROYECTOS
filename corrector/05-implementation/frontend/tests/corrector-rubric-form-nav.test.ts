// Nav/logout/tab-bar chrome — not tied to a single boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import type { RubricService } from '../src/services/rubric.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-rubric-form';
import type { CorrectorRubricForm } from '../src/components/corrector-rubric-form';

function makeRubricService(overrides: Partial<RubricService> = {}): RubricService {
  return {
    getForModule: async () => ({ ok: true, item: { id: 1, moduleId: 1, academicYear: '2020-2021', frozen: false, items: [] } }),
    addItem: async () => ({ ok: false, status: 500, code: '' }),
    updateItem: async () => ({ ok: false, status: 500, code: '' }),
    deleteItem: async () => ({ ok: true }),
    upload: async () => ({ ok: true }),
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
  rubricService: RubricService,
  legislationService: LegislationService,
  cycleService: CycleService,
  moduleService: ModuleService,
): CorrectorRubricForm {
  const el = document.createElement('corrector-rubric-form') as CorrectorRubricForm;
  el.rubricService = rubricService;
  el.legislationService = legislationService;
  el.cycleService = cycleService;
  el.moduleService = moduleService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('corrector-rubric-form: nav chrome', () => {
  it('dispatches corrector:logout when Salir is clicked', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    let logoutFired = false;
    document.addEventListener('corrector:logout', () => { logoutFired = true; }, { once: true });

    const button = el.shadowRoot!.querySelector('[data-action="logout"]') as HTMLButtonElement;
    button.click();

    expect(logoutFired).toBe(true);
    el.remove();
  });

  it('renders the Rúbrica tab as active and all other tabs as enabled', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const rubrica = el.shadowRoot!.querySelector('[data-action="tab-rubrica"]') as HTMLButtonElement;
    expect(rubrica.getAttribute('aria-selected')).toBe('true');

    for (const action of ['tab-alumnos', 'tab-proyectos', 'tab-asignacion']) {
      const tab = el.shadowRoot!.querySelector(`[data-action="${action}"]`) as HTMLButtonElement;
      expect(tab.disabled).toBe(false);
    }
    el.remove();
  });

  it('navigates to /profesor/gestionar/alumnos when the Alumnos tab is clicked', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
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
