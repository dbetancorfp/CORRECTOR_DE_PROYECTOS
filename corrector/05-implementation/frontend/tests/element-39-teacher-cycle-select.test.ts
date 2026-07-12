// sketchNumber: 39

import { describe, it, expect } from 'bun:test';
import type { TeacherService } from '../src/services/teacher.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-teachers-form';
import type { CorrectorTeachersForm } from '../src/components/corrector-teachers-form';

const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];

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
    list: async () => ({ ok: true, items: [{ id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' }] }),
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

async function selectYearAndLegislation(el: CorrectorTeachersForm): Promise<void> {
  const year = el.shadowRoot!.querySelector('[data-element-id="37"]') as HTMLSelectElement;
  year.value = '2020';
  year.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  const legislation = el.shadowRoot!.querySelector('[data-element-id="38"]') as HTMLSelectElement;
  legislation.value = '1';
  legislation.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
}

describe('Element #39 — corrector-teachers-form: selector ciclo (navegación)', () => {
  it('is disabled until #37 and #38 both have values', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="39"]') as HTMLSelectElement).disabled).toBe(true);
    el.remove();
  });

  it('is enabled with cycle options once both parents are selected', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectYearAndLegislation(el);

    const cycle = el.shadowRoot!.querySelector('[data-element-id="39"]') as HTMLSelectElement;
    expect(cycle.disabled).toBe(false);
    const names = Array.from(cycle.options).filter((o) => o.value !== '').map((o) => o.textContent);
    expect(names).toEqual(['DAW']);
    el.remove();
  });

  it('selecting a ciclo loads its modules into #40', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectYearAndLegislation(el);

    const cycle = el.shadowRoot!.querySelector('[data-element-id="39"]') as HTMLSelectElement;
    cycle.value = '1';
    cycle.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const module = el.shadowRoot!.querySelector('[data-element-id="40"]') as HTMLSelectElement;
    expect(module.disabled).toBe(false);
    const names = Array.from(module.options).filter((o) => o.value !== '').map((o) => o.textContent);
    expect(names).toEqual(['DEW']);
    el.remove();
  });
});
