// sketchNumbers: 86, 87, 88, 89, 90

import { describe, it, expect } from 'bun:test';
import type { RubricService } from '../src/services/rubric.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-rubric-form';
import type { CorrectorRubricForm } from '../src/components/corrector-rubric-form';

const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];
const MODULES = [
  { id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' },
  { id: 2, name: 'RED', weeklyHours: 5, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' },
];

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

async function selectCascadeUpToModule(el: CorrectorRubricForm): Promise<void> {
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
}

describe('Elements #86-90 — corrector-rubric-form: module selection cascade', () => {
  it('#88/#89/#90 start disabled and enable as the cascade fills in', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="88"]') as HTMLSelectElement).disabled).toBe(true);
    expect((el.shadowRoot!.querySelector('[data-element-id="89"]') as HTMLSelectElement).disabled).toBe(true);
    expect((el.shadowRoot!.querySelector('[data-element-id="90"]') as HTMLSelectElement).disabled).toBe(true);

    await selectCascadeUpToModule(el);

    expect((el.shadowRoot!.querySelector('[data-element-id="90"]') as HTMLSelectElement).disabled).toBe(false);
    el.remove();
  });

  it('#86 narrows the module options shown in #90 by name', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectCascadeUpToModule(el);

    const filter = el.shadowRoot!.querySelector('[data-element-id="86"]') as HTMLInputElement;
    filter.value = 'DEW';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 350));

    const module = el.shadowRoot!.querySelector('[data-element-id="90"]') as HTMLSelectElement;
    const names = Array.from(module.options).filter((o) => o.value !== '').map((o) => o.textContent);
    expect(names).toEqual(['DEW']);
    el.remove();
  });

  it('selecting a module in #90 loads its rubric items into #100', async () => {
    const items = [{
      id: 1, description: 'Documentación', displayOrder: 1,
      levels: [{ id: 1, name: 'Excelente', score: 2, displayOrder: 1 }, { id: 2, name: 'Mal', score: 0, displayOrder: 2 }],
    }];
    const el = mount(
      makeRubricService({ getForModule: async () => ({ ok: true, item: { id: 1, moduleId: 1, academicYear: '2020-2021', frozen: false, items } }) }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectCascadeUpToModule(el);

    const module = el.shadowRoot!.querySelector('[data-element-id="90"]') as HTMLSelectElement;
    module.value = '1';
    module.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="100"]') as HTMLTableElement;
    expect(table.textContent).toContain('Documentación');
    el.remove();
  });
});
