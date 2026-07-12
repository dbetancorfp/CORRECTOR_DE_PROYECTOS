// sketchNumbers: 91, 92, 93, 94, 95, 96, 97, 98

import { describe, it, expect } from 'bun:test';
import type { RubricService } from '../src/services/rubric.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-rubric-form';
import type { CorrectorRubricForm } from '../src/components/corrector-rubric-form';

const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];
const MODULES = [{ id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' }];

function makeRubricService(overrides: Partial<RubricService> = {}): RubricService {
  return {
    getForModule: async () => ({ ok: true, item: { id: 1, moduleId: 1, academicYear: '2020-2021', frozen: false, items: [] } }),
    addItem: async (moduleId, data) => ({ ok: true, item: { id: 99, description: data.description, displayOrder: data.displayOrder, levels: data.levels.map((l, i) => ({ id: i + 1, ...l })) } }),
    updateItem: async () => ({ ok: false, status: 500, code: '' }),
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

describe('Elements #91-98 — corrector-rubric-form: item builder', () => {
  it('#92 starts with the 3 default levels: Excelente, Bien, Mal', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const builder = el.shadowRoot!.querySelector('[data-element-id="92"]') as HTMLTableElement;
    expect(builder.textContent).toContain('Excelente');
    expect(builder.textContent).toContain('Bien');
    expect(builder.textContent).toContain('Mal');
    expect(el.shadowRoot!.querySelector('[data-element-id="94"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-element-id="95"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-element-id="96"]')).not.toBeNull();
    el.remove();
  });

  it('#96 (Mal) is always 0 and not editable', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const malCell = el.shadowRoot!.querySelector('[data-element-id="96"] input') as HTMLInputElement;
    expect(malCell.value).toBe('0');
    expect(malCell.disabled).toBe(true);
    el.remove();
  });

  it('#91 adds levels up to a maximum of 5 and then disables', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const addLevel = el.shadowRoot!.querySelector('[data-element-id="91"]') as HTMLButtonElement;
    expect(addLevel.disabled).toBe(false);
    addLevel.click();
    await flush();
    let builder = el.shadowRoot!.querySelector('[data-element-id="92"]') as HTMLTableElement;
    expect(builder.textContent).toContain('Muy bien');

    addLevel.click();
    await flush();
    builder = el.shadowRoot!.querySelector('[data-element-id="92"]') as HTMLTableElement;
    expect(builder.textContent).toContain('Regular');
    expect(addLevel.disabled).toBe(true);
    el.remove();
  });

  it('#98 is disabled until a module is selected', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="98"]') as HTMLButtonElement).disabled).toBe(true);
    el.remove();
  });

  it('#98 saves the item, clears the builder and adds a row to #100', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectModule(el);

    const name = el.shadowRoot!.querySelector('[data-element-id="93"] input') as HTMLInputElement;
    name.value = 'Documentación';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    const excelente = el.shadowRoot!.querySelector('[data-element-id="94"] input') as HTMLInputElement;
    excelente.value = '2';
    excelente.dispatchEvent(new Event('input', { bubbles: true }));

    const save = el.shadowRoot!.querySelector('[data-element-id="98"]') as HTMLButtonElement;
    save.click();
    await flush();

    const builderName = el.shadowRoot!.querySelector('[data-element-id="93"] input') as HTMLInputElement;
    expect(builderName.value).toBe('');
    const table = el.shadowRoot!.querySelector('[data-element-id="100"]') as HTMLTableElement;
    expect(table.textContent).toContain('Documentación');
    el.remove();
  });

  it('#98 shows an error when the name is empty', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectModule(el);

    const save = el.shadowRoot!.querySelector('[data-element-id="98"]') as HTMLButtonElement;
    save.click();
    await flush();

    expect(el.shadowRoot!.textContent).toContain('obligatorio');
    el.remove();
  });

  it('shows a blocked error when the Excelente sum would exceed 10', async () => {
    const el = mount(
      makeRubricService({ addItem: async () => ({ ok: false, status: 409, code: 'SCORE_LIMIT_EXCEEDED' }) }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectModule(el);

    const name = el.shadowRoot!.querySelector('[data-element-id="93"] input') as HTMLInputElement;
    name.value = 'Item caro';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    const save = el.shadowRoot!.querySelector('[data-element-id="98"]') as HTMLButtonElement;
    save.click();
    await flush();

    expect(el.shadowRoot!.textContent).toContain('máximo de 10');
    el.remove();
  });

  it('#97 clears the builder back to its default state', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const name = el.shadowRoot!.querySelector('[data-element-id="93"] input') as HTMLInputElement;
    name.value = 'Borrador';
    name.dispatchEvent(new Event('input', { bubbles: true }));

    const clear = el.shadowRoot!.querySelector('[data-element-id="97"]') as HTMLButtonElement;
    clear.click();
    await flush();

    const builderName = el.shadowRoot!.querySelector('[data-element-id="93"] input') as HTMLInputElement;
    expect(builderName.value).toBe('');
    el.remove();
  });
});
