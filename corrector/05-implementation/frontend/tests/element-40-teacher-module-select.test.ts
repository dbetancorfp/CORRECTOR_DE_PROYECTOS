// sketchNumber: 40

import { describe, it, expect } from 'bun:test';
import type { TeacherService } from '../src/services/teacher.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-teachers-form';
import type { CorrectorTeachersForm } from '../src/components/corrector-teachers-form';

const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];
const MODULES = [
  { id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' },
  { id: 2, name: 'RED', weeklyHours: 5, cycleId: 2, cycleName: 'ASIR', legislationId: 1, legislationName: 'LOMLOE' },
];

function makeTeacherService(overrides: Partial<TeacherService> = {}): TeacherService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (data) => ({ ok: true, item: { id: 1, username: data.username, role: 'profesor', passwordStatus: 'default', accountLocked: false, failedLoginAttempts: 0, modules: [] } }),
    update: async (id, data) => ({ ok: true, item: { id, username: data.username ?? '', role: 'profesor', passwordStatus: 'default', accountLocked: false, failedLoginAttempts: 0, modules: [] } }),
    delete: async () => ({ ok: true }),
    unlock: async () => ({ ok: true, accountLocked: false, failedLoginAttempts: 0 }),
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
  teacherService: TeacherService,
  legislationService: LegislationService,
  cycleService: CycleService,
  moduleService: ModuleService,
): CorrectorTeachersForm {
  const el = document.createElement('corrector-teachers-form') as CorrectorTeachersForm;
  el.teacherService = teacherService;
  el.legislationService = legislationService;
  el.cycleService = cycleService;
  el.moduleService = moduleService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('Element #40 — corrector-teachers-form: selector módulo', () => {
  it('is disabled until #39 has a value', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="40"]') as HTMLSelectElement).disabled).toBe(true);
    el.remove();
  });

  it('shows only modules belonging to the selected ciclo', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const year = el.shadowRoot!.querySelector('[data-element-id="37"]') as HTMLSelectElement;
    year.value = '2020';
    year.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const legislation = el.shadowRoot!.querySelector('[data-element-id="38"]') as HTMLSelectElement;
    legislation.value = '1';
    legislation.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const cycle = el.shadowRoot!.querySelector('[data-element-id="39"]') as HTMLSelectElement;
    cycle.value = '1';
    cycle.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const module = el.shadowRoot!.querySelector('[data-element-id="40"]') as HTMLSelectElement;
    const names = Array.from(module.options).filter((o) => o.value !== '').map((o) => o.textContent);
    expect(names).toEqual(['DEW']);
    el.remove();
  });

  it('shows an error state when submitted without a module selected', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const username = el.shadowRoot!.querySelector('[data-element-id="35"]') as HTMLInputElement;
    username.value = 'mariagon';
    username.dispatchEvent(new Event('input', { bubbles: true }));
    const password = el.shadowRoot!.querySelector('[data-element-id="36"]') as HTMLInputElement;
    password.value = '12345678';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    const year = el.shadowRoot!.querySelector('[data-element-id="37"]') as HTMLSelectElement;
    year.value = '2020';
    year.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const legislation = el.shadowRoot!.querySelector('[data-element-id="38"]') as HTMLSelectElement;
    legislation.value = '1';
    legislation.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const cycle = el.shadowRoot!.querySelector('[data-element-id="39"]') as HTMLSelectElement;
    cycle.value = '1';
    cycle.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const button = el.shadowRoot!.querySelector('[data-element-id="41"]') as HTMLButtonElement;
    button.click();
    await flush();

    const module = el.shadowRoot!.querySelector('[data-element-id="40"]') as HTMLSelectElement;
    expect(module.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });
});
