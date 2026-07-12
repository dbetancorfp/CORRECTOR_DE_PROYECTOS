// sketchNumber: 26

import { describe, it, expect } from 'bun:test';
import type { ModuleService } from '../src/services/module.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import '../src/components/corrector-modules-form';
import type { CorrectorModulesForm } from '../src/components/corrector-modules-form';

const LEGISLATIONS = [{ id: 1, name: 'LOE', startYear: 2006 }];

function makeModuleService(overrides: Partial<ModuleService> = {}): ModuleService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (data) => ({ ok: true, item: { id: 1, ...data, cycleName: '', legislationName: '' } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', weeklyHours: data.weeklyHours ?? 0, cycleId: data.cycleId ?? 0, cycleName: '', legislationId: data.legislationId ?? 0, legislationName: '' } }),
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

function mount(moduleService: ModuleService, legislationService: LegislationService, cycleService: CycleService): CorrectorModulesForm {
  const el = document.createElement('corrector-modules-form') as CorrectorModulesForm;
  el.moduleService = moduleService;
  el.legislationService = legislationService;
  el.cycleService = cycleService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Element #26 — corrector-modules-form: selector año', () => {
  it('is disabled until a legislation is selected in #25', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const year = el.shadowRoot!.querySelector('[data-element-id="26"]') as HTMLSelectElement;
    expect(year.disabled).toBe(true);
    el.remove();
  });

  it('is enabled once #25 has a value, showing that legislation\'s own year', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const legislation = el.shadowRoot!.querySelector('[data-element-id="25"]') as HTMLSelectElement;
    legislation.value = '1';
    legislation.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const year = el.shadowRoot!.querySelector('[data-element-id="26"]') as HTMLSelectElement;
    expect(year.disabled).toBe(false);
    el.remove();
  });

  it('shows an error state when submitted without a year selected', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const legislation = el.shadowRoot!.querySelector('[data-element-id="25"]') as HTMLSelectElement;
    legislation.value = '1';
    legislation.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const button = el.shadowRoot!.querySelector('[data-element-id="28"]') as HTMLButtonElement;
    button.click();
    await flush();

    const year = el.shadowRoot!.querySelector('[data-element-id="26"]') as HTMLSelectElement;
    expect(year.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });
});
