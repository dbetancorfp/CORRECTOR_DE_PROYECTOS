// sketchNumber: 24

import { describe, it, expect } from 'bun:test';
import type { ModuleService } from '../src/services/module.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import '../src/components/corrector-modules-form';
import type { CorrectorModulesForm } from '../src/components/corrector-modules-form';

function makeModuleService(overrides: Partial<ModuleService> = {}): ModuleService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (data) => ({ ok: true, item: { id: 1, ...data, cycleName: 'DAW', legislationName: 'LOMLOE' } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', weeklyHours: data.weeklyHours ?? 0, cycleId: data.cycleId ?? 0, cycleName: '', legislationId: data.legislationId ?? 0, legislationName: '' } }),
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

describe('Element #24 — corrector-modules-form: horas semanales', () => {
  it('shows an error state when out of the 1-30 range', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const name = el.shadowRoot!.querySelector('[data-element-id="23"]') as HTMLInputElement;
    name.value = 'Desarrollo Web';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    const hours = el.shadowRoot!.querySelector('[data-element-id="24"]') as HTMLInputElement;
    hours.value = '31';
    hours.dispatchEvent(new Event('input', { bubbles: true }));

    const button = el.shadowRoot!.querySelector('[data-element-id="28"]') as HTMLButtonElement;
    button.click();
    await flush();

    const hoursAfter = el.shadowRoot!.querySelector('[data-element-id="24"]') as HTMLInputElement;
    expect(hoursAfter.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });

  it('shows an error state when submitted empty', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const button = el.shadowRoot!.querySelector('[data-element-id="28"]') as HTMLButtonElement;
    button.click();
    await flush();

    const hours = el.shadowRoot!.querySelector('[data-element-id="24"]') as HTMLInputElement;
    expect(hours.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });
});
