// sketchNumber: 32

import { describe, it, expect } from 'bun:test';
import type { ModuleService } from '../src/services/module.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import '../src/components/corrector-modules-form';
import type { CorrectorModulesForm } from '../src/components/corrector-modules-form';

const MODULES = [
  { id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOE' },
  { id: 2, name: 'RED', weeklyHours: 5, cycleId: 2, cycleName: 'ASIR', legislationId: 1, legislationName: 'LOE' },
];

function makeModuleService(overrides: Partial<ModuleService> = {}): ModuleService {
  return {
    list: async () => ({ ok: true, items: MODULES }),
    create: async (data) => ({ ok: true, item: { id: 9, ...data, cycleName: '', legislationName: '' } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', weeklyHours: data.weeklyHours ?? 0, cycleId: data.cycleId ?? 0, cycleName: '', legislationId: data.legislationId ?? 0, legislationName: '' } }),
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Element #32 — corrector-modules-form: filtro por nombre de módulo', () => {
  it('filters rows by module name substring, case-insensitively', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const filter = el.shadowRoot!.querySelector('[data-element-id="32"]') as HTMLInputElement;
    filter.value = 'red';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="33"]') as HTMLTableElement;
    expect(table.textContent).toContain('RED');
    expect(table.textContent).not.toContain('DEW');
    el.remove();
  });

  it('restores all rows when the filter is cleared', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const filter = el.shadowRoot!.querySelector('[data-element-id="32"]') as HTMLInputElement;
    filter.value = 'red';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);
    filter.value = '';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="33"]') as HTMLTableElement;
    expect(table.textContent).toContain('DEW');
    expect(table.textContent).toContain('RED');
    el.remove();
  });
});
