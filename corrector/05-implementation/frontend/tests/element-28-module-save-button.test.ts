// sketchNumber: 28

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
    create: async (data) => ({ ok: true, item: { id: 1, ...data, cycleName: 'DAW', legislationName: 'LOE' } }),
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

async function fillValidForm(el: CorrectorModulesForm): Promise<void> {
  const name = el.shadowRoot!.querySelector('[data-element-id="23"]') as HTMLInputElement;
  name.value = 'Desarrollo Web';
  name.dispatchEvent(new Event('input', { bubbles: true }));
  const hours = el.shadowRoot!.querySelector('[data-element-id="24"]') as HTMLInputElement;
  hours.value = '7';
  hours.dispatchEvent(new Event('input', { bubbles: true }));
  const legislation = el.shadowRoot!.querySelector('[data-element-id="25"]') as HTMLSelectElement;
  legislation.value = '1';
  legislation.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  const year = el.shadowRoot!.querySelector('[data-element-id="26"]') as HTMLSelectElement;
  year.value = '2006';
  year.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  const cycle = el.shadowRoot!.querySelector('[data-element-id="27"]') as HTMLSelectElement;
  cycle.value = '1';
  cycle.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Element #28 — corrector-modules-form: Guardar button', () => {
  it('clears the form and adds the new row to the table on success', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();
    await fillValidForm(el);

    const button = el.shadowRoot!.querySelector('[data-element-id="28"]') as HTMLButtonElement;
    button.click();
    await flush();

    const nameAfter = el.shadowRoot!.querySelector('[data-element-id="23"]') as HTMLInputElement;
    expect(nameAfter.value).toBe('');
    const table = el.shadowRoot!.querySelector('[data-element-id="33"]') as HTMLTableElement;
    expect(table.textContent).toContain('Desarrollo Web');
    el.remove();
  });

  it('shows an "already exists" error for a duplicate name+cycle+legislation', async () => {
    const el = mount(
      makeModuleService({ create: async () => ({ ok: false, status: 409, code: 'DUPLICATE' }) }),
      makeLegislationService(),
      makeCycleService(),
    );
    await flush();
    await fillValidForm(el);

    const button = el.shadowRoot!.querySelector('[data-element-id="28"]') as HTMLButtonElement;
    button.click();
    await flush();

    expect(el.shadowRoot!.textContent).toMatch(/ya existe/i);
    el.remove();
  });

  it('shows a loading state while the request is in flight', async () => {
    let resolveCreate: (() => void) | null = null;
    const el = mount(
      makeModuleService({
        create: (data) => new Promise((resolve) => {
          resolveCreate = () => resolve({ ok: true, item: { id: 1, ...data, cycleName: 'DAW', legislationName: 'LOE' } });
        }),
      }),
      makeLegislationService(),
      makeCycleService(),
    );
    await flush();
    await fillValidForm(el);

    const button = el.shadowRoot!.querySelector('[data-element-id="28"]') as HTMLButtonElement;
    button.click();
    await Promise.resolve();

    expect((el.shadowRoot!.querySelector('[data-element-id="28"]') as HTMLButtonElement).disabled).toBe(true);

    resolveCreate!();
    await flush();
    el.remove();
  });
});
