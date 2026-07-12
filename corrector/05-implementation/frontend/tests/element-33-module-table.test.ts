// sketchNumber: 33

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import type { ModuleService } from '../src/services/module.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import '../src/components/corrector-modules-form';
import type { CorrectorModulesForm } from '../src/components/corrector-modules-form';

const LEGISLATIONS = [{ id: 1, name: 'LOE', startYear: 2006 }];
const MODULES = [
  { id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOE' },
  { id: 2, name: 'RED', weeklyHours: 5, cycleId: 2, cycleName: 'ASIR', legislationId: 1, legislationName: 'LOE' },
];

function makeModuleService(overrides: Partial<ModuleService> = {}): ModuleService {
  return {
    list: async () => ({ ok: true, items: MODULES }),
    create: async (data) => ({ ok: true, item: { id: 9, ...data, cycleName: '', legislationName: '' } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', weeklyHours: data.weeklyHours ?? 0, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOE' } }),
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

let originalConfirm: typeof window.confirm;

beforeEach(() => {
  originalConfirm = window.confirm;
});

afterEach(() => {
  window.confirm = originalConfirm;
});

describe('Element #33 — corrector-modules-form: tabla de módulos', () => {
  it('loads and displays name, cycle, year, legislation and weekly hours for each module', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="33"]') as HTMLTableElement;
    expect(table.textContent).toContain('DEW');
    expect(table.textContent).toContain('DAW');
    expect(table.textContent).toContain('2006');
    expect(table.textContent).toContain('LOE');
    expect(table.textContent).toContain('7');
    el.remove();
  });

  it('shows an empty state message when no modules exist', async () => {
    const el = mount(makeModuleService({ list: async () => ({ ok: true, items: [] }) }), makeLegislationService(), makeCycleService());
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="33"]') as HTMLTableElement;
    expect(table.querySelectorAll('tbody tr').length).toBe(0);
    expect(el.shadowRoot!.textContent).toMatch(/no hay módulos/i);
    el.remove();
  });

  it('enters edit mode (name + horas) and shows Guardar when the edit icon is clicked', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const editButton = el.shadowRoot!.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editButton.click();
    await flush();

    const saveButton = el.shadowRoot!.querySelector('[data-action="save"]') as HTMLButtonElement;
    expect(saveButton).not.toBeNull();
    const row = saveButton.closest('tr')!;
    expect(row.querySelectorAll('input').length).toBe(2);
    el.remove();
  });

  it('persists an inline edit (name + horas) and updates the table without reload', async () => {
    let updated: { id: number; name?: string; weeklyHours?: number } | null = null;
    const el = mount(
      makeModuleService({
        update: async (id, data) => { updated = { id, ...data }; return { ok: true, item: { id, name: data.name ?? '', weeklyHours: data.weeklyHours ?? 0, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOE' } }; },
      }),
      makeLegislationService(),
      makeCycleService(),
    );
    await flush();

    const editButton = el.shadowRoot!.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editButton.click();
    await flush();

    const inputs = el.shadowRoot!.querySelectorAll('tbody tr input');
    (inputs[0] as HTMLInputElement).value = 'DEW actualizado';
    inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    (inputs[1] as HTMLInputElement).value = '10';
    inputs[1].dispatchEvent(new Event('input', { bubbles: true }));

    const saveButton = el.shadowRoot!.querySelector('[data-action="save"]') as HTMLButtonElement;
    saveButton.click();
    await flush();

    expect(updated).toEqual({ id: 1, name: 'DEW actualizado', weeklyHours: 10 });
    el.remove();
  });

  it('shows a confirmation dialog and removes the row when delete is confirmed with no dependencies', async () => {
    window.confirm = mock(() => true);
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const deleteButtons = el.shadowRoot!.querySelectorAll('[data-action="delete"]');
    (deleteButtons[1] as HTMLButtonElement).click();
    await flush();

    expect(window.confirm).toHaveBeenCalled();
    const table = el.shadowRoot!.querySelector('[data-element-id="33"]') as HTMLTableElement;
    expect(table.textContent).not.toContain('RED');
    el.remove();
  });

  it('blocks deletion when the module has dependent projects and shows an error', async () => {
    window.confirm = mock(() => true);
    const el = mount(
      makeModuleService({ delete: async () => ({ ok: false, status: 409, code: 'HAS_DEPENDANTS' }) }),
      makeLegislationService(),
      makeCycleService(),
    );
    await flush();

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(el.shadowRoot!.textContent).toMatch(/proyectos|dependientes/i);
    const table = el.shadowRoot!.querySelector('[data-element-id="33"]') as HTMLTableElement;
    expect(table.textContent).toContain('DEW');
    el.remove();
  });
});
