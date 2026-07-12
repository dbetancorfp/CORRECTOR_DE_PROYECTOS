// sketchNumber: 25

import { describe, it, expect } from 'bun:test';
import type { ModuleService } from '../src/services/module.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import '../src/components/corrector-modules-form';
import type { CorrectorModulesForm } from '../src/components/corrector-modules-form';

const LEGISLATIONS = [
  { id: 1, name: 'LOE', startYear: 2006 },
  { id: 2, name: 'LOMLOE', startYear: 2020 },
];

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
    list: async () => ({ ok: true, items: [] }),
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

describe('Element #25 — corrector-modules-form: selector legislación', () => {
  it('offers all legislations as options', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const select = el.shadowRoot!.querySelector('[data-element-id="25"]') as HTMLSelectElement;
    const names = Array.from(select.options).filter((o) => o.value !== '').map((o) => o.textContent);
    expect(names.sort()).toEqual(['LOE', 'LOMLOE']);
    el.remove();
  });

  it('shows an error state when submitted without a legislation selected', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const button = el.shadowRoot!.querySelector('[data-element-id="28"]') as HTMLButtonElement;
    button.click();
    await flush();

    const legislation = el.shadowRoot!.querySelector('[data-element-id="25"]') as HTMLSelectElement;
    expect(legislation.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });

  it('selecting a legislation updates the year options in #26', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const legislation = el.shadowRoot!.querySelector('[data-element-id="25"]') as HTMLSelectElement;
    legislation.value = '2';
    legislation.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const year = el.shadowRoot!.querySelector('[data-element-id="26"]') as HTMLSelectElement;
    const years = Array.from(year.options).filter((o) => o.value !== '').map((o) => o.value);
    expect(years).toEqual(['2020']);
    el.remove();
  });
});
