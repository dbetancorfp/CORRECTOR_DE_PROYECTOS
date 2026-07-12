// sketchNumber: 44

import { describe, it, expect } from 'bun:test';
import type { TeacherService } from '../src/services/teacher.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-teachers-form';
import type { CorrectorTeachersForm } from '../src/components/corrector-teachers-form';

const MODULES = [
  { id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOE' },
  { id: 2, name: 'RED', weeklyHours: 5, cycleId: 2, cycleName: 'ASIR', legislationId: 1, legislationName: 'LOE' },
];
const TEACHERS = [
  { id: 1, username: 'juanford', role: 'profesor' as const, passwordStatus: 'changed' as const, accountLocked: false, failedLoginAttempts: 0, modules: [{ id: 1, name: 'DEW' }] },
  { id: 2, username: 'mariagon', role: 'profesor' as const, passwordStatus: 'default' as const, accountLocked: false, failedLoginAttempts: 0, modules: [{ id: 2, name: 'RED' }] },
];

function makeTeacherService(overrides: Partial<TeacherService> = {}): TeacherService {
  return {
    list: async () => ({ ok: true, items: TEACHERS }),
    create: async (data) => ({ ok: true, item: { id: 9, username: data.username, role: 'profesor', passwordStatus: 'default', accountLocked: false, failedLoginAttempts: 0, modules: [] } }),
    update: async (id, data) => ({ ok: true, item: { id, username: data.username ?? '', role: 'profesor', passwordStatus: 'default', accountLocked: false, failedLoginAttempts: 0, modules: [] } }),
    delete: async () => ({ ok: true }),
    unlock: async () => ({ ok: true, accountLocked: false, failedLoginAttempts: 0 }),
    ...overrides,
  };
}

function makeLegislationService(overrides: Partial<LegislationService> = {}): LegislationService {
  return {
    list: async () => ({ ok: true, items: [] }),
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Element #44 — corrector-teachers-form: filtro por ciclo', () => {
  it('filters rows by cycle name substring, case-insensitively', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const filter = el.shadowRoot!.querySelector('[data-element-id="44"]') as HTMLInputElement;
    filter.value = 'asir';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="46"]') as HTMLTableElement;
    expect(table.textContent).toContain('mariagon');
    expect(table.textContent).not.toContain('juanford');
    el.remove();
  });

  it('restores all rows when the filter is cleared', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const filter = el.shadowRoot!.querySelector('[data-element-id="44"]') as HTMLInputElement;
    filter.value = 'asir';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);
    filter.value = '';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="46"]') as HTMLTableElement;
    expect(table.textContent).toContain('juanford');
    expect(table.textContent).toContain('mariagon');
    el.remove();
  });
});
