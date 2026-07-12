// sketchNumbers: 49, 50, 51, 52

import { describe, it, expect } from 'bun:test';
import type { StudentService } from '../src/services/student.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-students-form';
import type { CorrectorStudentsForm } from '../src/components/corrector-students-form';

const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];
const MODULES = [
  { id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' },
  { id: 2, name: 'RED', weeklyHours: 5, cycleId: 2, cycleName: 'ASIR', legislationId: 1, legislationName: 'LOMLOE' },
];

function makeStudentService(overrides: Partial<StudentService> = {}): StudentService {
  return {
    list: async () => ({ ok: true, items: [] }),
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

describe('Elements #49–#52 — corrector-students-form: cascade selects', () => {
  it('#50/#51/#52 start disabled and enable step by step as the cascade is filled', async () => {
    const el = mount(makeStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="51"]') as HTMLSelectElement).disabled).toBe(true);
    expect((el.shadowRoot!.querySelector('[data-element-id="52"]') as HTMLSelectElement).disabled).toBe(true);

    const year = el.shadowRoot!.querySelector('[data-element-id="49"]') as HTMLSelectElement;
    year.value = '2020';
    year.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const legislation = el.shadowRoot!.querySelector('[data-element-id="50"]') as HTMLSelectElement;
    legislation.value = '1';
    legislation.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="51"]') as HTMLSelectElement).disabled).toBe(false);
    el.remove();
  });

  it('#52 shows only modules belonging to the selected ciclo', async () => {
    const el = mount(makeStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const year = el.shadowRoot!.querySelector('[data-element-id="49"]') as HTMLSelectElement;
    year.value = '2020';
    year.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const legislation = el.shadowRoot!.querySelector('[data-element-id="50"]') as HTMLSelectElement;
    legislation.value = '1';
    legislation.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const cycle = el.shadowRoot!.querySelector('[data-element-id="51"]') as HTMLSelectElement;
    cycle.value = '1';
    cycle.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const module = el.shadowRoot!.querySelector('[data-element-id="52"]') as HTMLSelectElement;
    const names = Array.from(module.options).filter((o) => o.value !== '').map((o) => o.textContent);
    expect(names).toEqual(['DEW']);
    el.remove();
  });

  it('shows error state on all cascade fields when submitted without selection', async () => {
    const el = mount(makeStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const name = el.shadowRoot!.querySelector('[data-element-id="48"]') as HTMLInputElement;
    name.value = 'JJ499';
    name.dispatchEvent(new Event('input', { bubbles: true }));

    const button = el.shadowRoot!.querySelector('[data-element-id="53"]') as HTMLButtonElement;
    button.click();
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="49"]') as HTMLSelectElement).getAttribute('aria-invalid')).toBe('true');
    expect((el.shadowRoot!.querySelector('[data-element-id="50"]') as HTMLSelectElement).getAttribute('aria-invalid')).toBe('true');
    expect((el.shadowRoot!.querySelector('[data-element-id="51"]') as HTMLSelectElement).getAttribute('aria-invalid')).toBe('true');
    expect((el.shadowRoot!.querySelector('[data-element-id="52"]') as HTMLSelectElement).getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });
});
