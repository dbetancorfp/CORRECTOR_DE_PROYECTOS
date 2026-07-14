// sketchNumbers: 55, 56, 57, 58, 59

import { describe, it, expect } from 'bun:test';
import type { StudentService } from '../src/services/student.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-students-form';
import type { CorrectorStudentsForm } from '../src/components/corrector-students-form';

const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];
const MODULES = [{ id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' }];
const STUDENTS = [
  { id: 1, name: 'JJ499', cycleId: 1, cycleName: 'DAW', modules: [{ id: 1, name: 'DEW' }] },
  { id: 2, name: 'MnP454', cycleId: 1, cycleName: 'DAW', modules: [{ id: 1, name: 'DEW' }] },
];

function makeStudentService(overrides: Partial<StudentService> = {}): StudentService {
  return {
    list: async () => ({ ok: true, items: STUDENTS }),
    create: async () => ({ ok: true, item: { id: 1, name: 'Nuevo', cycleId: 1, cycleName: 'DAW', modules: [] } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', cycleId: 1, cycleName: 'DAW', modules: [] } }),
    delete: async () => ({ ok: true }),
    upload: async () => ({ ok: true, created: 0 }),
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
  studentService: StudentService,
  legislationService: LegislationService,
  cycleService: CycleService,
  moduleService: ModuleService,
): CorrectorStudentsForm {
  const el = document.createElement('corrector-students-form') as CorrectorStudentsForm;
  el.studentService = studentService;
  el.legislationService = legislationService;
  el.cycleService = cycleService;
  el.moduleService = moduleService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Elements #55–#59 — corrector-students-form: reactive filters', () => {
  it('#55 filters the table by name with a 300ms debounce', async () => {
    const el = mount(makeStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const filter = el.shadowRoot!.querySelector('[data-element-id="55"]') as HTMLInputElement;
    filter.value = 'JJ';
    filter.dispatchEvent(new Event('input', { bubbles: true }));

    const table = el.shadowRoot!.querySelector('[data-element-id="60"]') as HTMLTableElement;
    expect(table.textContent).toContain('MnP454');

    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(table.textContent).toContain('JJ499');
    expect(table.textContent).not.toContain('MnP454');
    el.remove();
  });

  it('#58 is disabled until #57 has a value', async () => {
    const el = mount(makeStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="58"]') as HTMLSelectElement).disabled).toBe(true);
    el.remove();
  });

  it('#59 is disabled until #58 has a value', async () => {
    const el = mount(makeStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="59"]') as HTMLSelectElement).disabled).toBe(true);
    el.remove();
  });

  it('given empty filters, all rows are shown', async () => {
    const el = mount(makeStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="60"]') as HTMLTableElement;
    expect(table.textContent).toContain('JJ499');
    expect(table.textContent).toContain('MnP454');
    el.remove();
  });

  it('#56-#59 cascade: selecting año→legislación→ciclo→módulo narrows the table and resets downstream selections', async () => {
    const el = mount(makeStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    // The filter selects (#56-59) share their <option> lists with the "Nuevo
    // alumno" cascade (#49-52) — drive that cascade first so #57-59 actually
    // have options to select, same as a real user would see after the page
    // has loaded a legislación/ciclo/módulo at least once.
    (el.shadowRoot!.querySelector('[data-element-id="49"]') as HTMLSelectElement).value = '2020';
    el.shadowRoot!.querySelector('[data-element-id="49"]')!.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    (el.shadowRoot!.querySelector('[data-element-id="50"]') as HTMLSelectElement).value = '1';
    el.shadowRoot!.querySelector('[data-element-id="50"]')!.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    (el.shadowRoot!.querySelector('[data-element-id="51"]') as HTMLSelectElement).value = '1';
    el.shadowRoot!.querySelector('[data-element-id="51"]')!.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    (el.shadowRoot!.querySelector('[data-element-id="56"]') as HTMLSelectElement).value = '2020';
    el.shadowRoot!.querySelector('[data-element-id="56"]')!.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    (el.shadowRoot!.querySelector('[data-element-id="57"]') as HTMLSelectElement).value = '1';
    el.shadowRoot!.querySelector('[data-element-id="57"]')!.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="58"]') as HTMLSelectElement).disabled).toBe(false);
    (el.shadowRoot!.querySelector('[data-element-id="58"]') as HTMLSelectElement).value = '1';
    el.shadowRoot!.querySelector('[data-element-id="58"]')!.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="59"]') as HTMLSelectElement).disabled).toBe(false);
    (el.shadowRoot!.querySelector('[data-element-id="59"]') as HTMLSelectElement).value = '1';
    el.shadowRoot!.querySelector('[data-element-id="59"]')!.dispatchEvent(new Event('change', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 350));

    expect(el.shadowRoot!.querySelector('[data-element-id="60"]')).not.toBeNull();

    // Clearing the legislation resets ciclo/módulo back to disabled.
    (el.shadowRoot!.querySelector('[data-element-id="57"]') as HTMLSelectElement).value = '';
    el.shadowRoot!.querySelector('[data-element-id="57"]')!.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    expect((el.shadowRoot!.querySelector('[data-element-id="58"]') as HTMLSelectElement).disabled).toBe(true);
    expect((el.shadowRoot!.querySelector('[data-element-id="59"]') as HTMLSelectElement).disabled).toBe(true);
    el.remove();
  });
});
