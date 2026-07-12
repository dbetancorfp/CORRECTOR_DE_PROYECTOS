// sketchNumber: 100

import { describe, it, expect } from 'bun:test';
import type { RubricService } from '../src/services/rubric.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-rubric-form';
import type { CorrectorRubricForm } from '../src/components/corrector-rubric-form';

const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];
const MODULES = [{ id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' }];
const ITEMS = [{
  id: 1, description: 'Documentación', displayOrder: 1,
  levels: [
    { id: 1, name: 'Excelente', score: 2, displayOrder: 1 },
    { id: 2, name: 'Bien', score: 1, displayOrder: 2 },
    { id: 3, name: 'Mal', score: 0, displayOrder: 3 },
  ],
}];

function makeRubricService(overrides: Partial<RubricService> = {}): RubricService {
  return {
    getForModule: async () => ({ ok: true, item: { id: 1, moduleId: 1, academicYear: '2020-2021', frozen: false, items: ITEMS } }),
    addItem: async () => ({ ok: false, status: 500, code: '' }),
    updateItem: async (id, data) => ({ ok: true, item: { id, description: data.description ?? '', displayOrder: 1, levels: (data.levels ?? []).map((l, i) => ({ id: i + 1, ...l })) } }),
    deleteItem: async () => ({ ok: true }),
    upload: async () => ({ ok: true }),
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

function makeModuleService(overrides: Partial<ModuleService> = {}): ModuleService {
  return {
    list: async () => ({ ok: true, items: MODULES }),
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

async function selectModule(el: CorrectorRubricForm): Promise<void> {
  const year = el.shadowRoot!.querySelector('[data-element-id="87"]') as HTMLSelectElement;
  year.value = '2020';
  year.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  const legislation = el.shadowRoot!.querySelector('[data-element-id="88"]') as HTMLSelectElement;
  legislation.value = '1';
  legislation.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  const cycle = el.shadowRoot!.querySelector('[data-element-id="89"]') as HTMLSelectElement;
  cycle.value = '1';
  cycle.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  const module = el.shadowRoot!.querySelector('[data-element-id="90"]') as HTMLSelectElement;
  module.value = '1';
  module.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
}

describe('Element #100 — corrector-rubric-form: full rubric table', () => {
  it('shows an empty state when the module has no rubric items', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect(el.shadowRoot!.textContent).toContain('No hay ítems en la rúbrica');
    el.remove();
  });

  it('shows all 5 level columns even though the item only defines 3', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectModule(el);

    const table = el.shadowRoot!.querySelector('[data-element-id="100"]') as HTMLTableElement;
    expect(table.textContent).toContain('Documentación');
    expect(table.textContent).toContain('Muy bien');
    expect(table.textContent).toContain('Regular');
    el.remove();
  });

  it('clicking Editar loads the item into the builder for editing', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectModule(el);

    const editButton = el.shadowRoot!.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editButton.click();
    await flush();

    const builderName = el.shadowRoot!.querySelector('[data-element-id="93"] input') as HTMLInputElement;
    expect(builderName.value).toBe('Documentación');
    expect(el.shadowRoot!.textContent).toContain('Editar item:');
    el.remove();
  });

  it('saving after Editar calls updateItem instead of addItem', async () => {
    let updateCalled = false;
    const el = mount(
      makeRubricService({ updateItem: async (id, data) => { updateCalled = true; return { ok: true, item: { id, description: data.description ?? '', displayOrder: 1, levels: [] } }; } }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectModule(el);

    const editButton = el.shadowRoot!.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editButton.click();
    await flush();
    const save = el.shadowRoot!.querySelector('[data-element-id="98"]') as HTMLButtonElement;
    save.click();
    await flush();

    expect(updateCalled).toBe(true);
    el.remove();
  });

  it('deletes an item after confirmation', async () => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    let deletedId: number | null = null;
    const el = mount(
      makeRubricService({ deleteItem: async (id) => { deletedId = id; return { ok: true }; } }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectModule(el);

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(deletedId).toBe(1);
    window.confirm = originalConfirm;
    el.remove();
  });

  it('shows a blocked error when deleting an item from a frozen rubric', async () => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    const el = mount(
      makeRubricService({ deleteItem: async () => ({ ok: false, status: 423, code: 'RUBRIC_FROZEN' }) }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectModule(el);

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(el.shadowRoot!.textContent).toContain('congelada');
    window.confirm = originalConfirm;
    el.remove();
  });
});
