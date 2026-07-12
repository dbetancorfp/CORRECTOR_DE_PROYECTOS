// sketchNumber: 99

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

function selectFile(input: HTMLInputElement, file: File): void {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Element #99 — corrector-rubric-form: Subir rúbrica', () => {
  it('accepts csv, json and yaml via the accept attribute', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const input = el.shadowRoot!.querySelector('[data-element-id="99"]') as HTMLInputElement;
    expect(input.accept).toContain('.csv');
    expect(input.accept).toContain('.json');
    expect(input.accept).toContain('.yaml');
    el.remove();
  });

  it('is disabled until a module is selected', async () => {
    const el = mount(makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="99"]') as HTMLInputElement).disabled).toBe(true);
    el.remove();
  });

  it('uploads without confirmation when no rubric conflict, and reloads #100', async () => {
    let uploadedConfirm: boolean | null = null;
    const el = mount(
      makeRubricService({
        upload: async (moduleId, academicYear, file, confirm) => { uploadedConfirm = confirm; return { ok: true }; },
        getForModule: async () => ({ ok: true, item: { id: 1, moduleId: 1, academicYear: '2020-2021', frozen: false, items: [{ id: 1, description: 'Subido', displayOrder: 1, levels: [] }] } }),
      }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectModule(el);

    const input = el.shadowRoot!.querySelector('[data-element-id="99"]') as HTMLInputElement;
    selectFile(input, new File(['item,excelente,mal\nX,2,0'], 'rubrica.csv', { type: 'text/csv' }));
    await flush();

    expect(uploadedConfirm).toBe(false);
    const table = el.shadowRoot!.querySelector('[data-element-id="100"]') as HTMLTableElement;
    expect(table.textContent).toContain('Subido');
    el.remove();
  });

  it('asks for confirmation and retries when a rubric already exists, cancelling on decline', async () => {
    const originalConfirm = window.confirm;
    window.confirm = () => false;
    let uploadCalls = 0;
    const el = mount(
      makeRubricService({ upload: async () => { uploadCalls += 1; return { ok: false, status: 409, code: 'REQUIRES_CONFIRMATION' }; } }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectModule(el);

    const input = el.shadowRoot!.querySelector('[data-element-id="99"]') as HTMLInputElement;
    selectFile(input, new File(['item,excelente,mal\nX,2,0'], 'rubrica.csv', { type: 'text/csv' }));
    await flush();

    expect(uploadCalls).toBe(1);
    window.confirm = originalConfirm;
    el.remove();
  });
});
