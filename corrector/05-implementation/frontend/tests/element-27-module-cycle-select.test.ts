// sketchNumber: 27

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
    list: async () => ({ ok: true, items: [{ id: 1, name: 'DAW' }, { id: 2, name: 'ASIR' }] }),
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

describe('Element #27 — corrector-modules-form: selector ciclo', () => {
  it('is disabled until both #25 and #26 have values', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const cycle = el.shadowRoot!.querySelector('[data-element-id="27"]') as HTMLSelectElement;
    expect(cycle.disabled).toBe(true);

    const legislation = el.shadowRoot!.querySelector('[data-element-id="25"]') as HTMLSelectElement;
    legislation.value = '1';
    legislation.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="27"]') as HTMLSelectElement).disabled).toBe(true);
    el.remove();
  });

  it('is enabled with cycle options once #25 and #26 both have values', async () => {
    let requestedLegislationId: number | undefined;
    const el = mount(
      makeModuleService(),
      makeLegislationService(),
      makeCycleService({ list: async (filters) => { requestedLegislationId = filters?.legislationId; return { ok: true, items: [{ id: 1, name: 'DAW' }] }; } }),
    );
    await flush();

    const legislation = el.shadowRoot!.querySelector('[data-element-id="25"]') as HTMLSelectElement;
    legislation.value = '1';
    legislation.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const year = el.shadowRoot!.querySelector('[data-element-id="26"]') as HTMLSelectElement;
    year.value = '2006';
    year.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const cycle = el.shadowRoot!.querySelector('[data-element-id="27"]') as HTMLSelectElement;
    expect(cycle.disabled).toBe(false);
    expect(requestedLegislationId).toBe(1);
    const names = Array.from(cycle.options).filter((o) => o.value !== '').map((o) => o.textContent);
    expect(names).toEqual(['DAW']);
    el.remove();
  });

  it('shows an error state when submitted without a cycle selected', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const legislation = el.shadowRoot!.querySelector('[data-element-id="25"]') as HTMLSelectElement;
    legislation.value = '1';
    legislation.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const year = el.shadowRoot!.querySelector('[data-element-id="26"]') as HTMLSelectElement;
    year.value = '2006';
    year.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const button = el.shadowRoot!.querySelector('[data-element-id="28"]') as HTMLButtonElement;
    button.click();
    await flush();

    const cycle = el.shadowRoot!.querySelector('[data-element-id="27"]') as HTMLSelectElement;
    expect(cycle.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });
});
