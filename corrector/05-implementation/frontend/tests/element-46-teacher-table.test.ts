// sketchNumber: 46

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import type { TeacherService } from '../src/services/teacher.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-teachers-form';
import type { CorrectorTeachersForm } from '../src/components/corrector-teachers-form';

const MODULES = [{ id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOE' }];
const TEACHERS = [
  { id: 1, username: 'juanford', role: 'profesor' as const, passwordStatus: 'default' as const, accountLocked: false, failedLoginAttempts: 0, modules: [{ id: 1, name: 'DEW' }] },
  { id: 2, username: 'mariagon', role: 'profesor' as const, passwordStatus: 'changed' as const, accountLocked: true, failedLoginAttempts: 3, modules: [] },
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

let originalConfirm: typeof window.confirm;

beforeEach(() => {
  originalConfirm = window.confirm;
});

afterEach(() => {
  window.confirm = originalConfirm;
});

describe('Element #46 — corrector-teachers-form: tabla de profesorado', () => {
  it('shows "12345678" for a default password and "********" once changed', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="46"]') as HTMLTableElement;
    expect(table.textContent).toContain('12345678');
    expect(table.textContent).toContain('********');
    el.remove();
  });

  it('shows an empty state message when no teachers exist', async () => {
    const el = mount(makeTeacherService({ list: async () => ({ ok: true, items: [] }) }), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="46"]') as HTMLTableElement;
    expect(table.querySelectorAll('tbody tr').length).toBe(0);
    expect(el.shadowRoot!.textContent).toMatch(/no hay profesores/i);
    el.remove();
  });

  it('shows an unlock action only for locked accounts', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const unlockButtons = el.shadowRoot!.querySelectorAll('[data-action="unlock"]');
    expect(unlockButtons.length).toBe(1);
    el.remove();
  });

  it('unlocking a locked account calls the service and clears the locked state', async () => {
    let unlockedId: number | null = null;
    const el = mount(
      makeTeacherService({ unlock: async (id) => { unlockedId = id; return { ok: true, accountLocked: false, failedLoginAttempts: 0 }; } }),
      makeLegislationService(),
      makeCycleService(),
      makeModuleService(),
    );
    await flush();

    const unlockButton = el.shadowRoot!.querySelector('[data-action="unlock"]') as HTMLButtonElement;
    unlockButton.click();
    await flush();

    expect(unlockedId).toBe(2);
    expect(el.shadowRoot!.querySelectorAll('[data-action="unlock"]').length).toBe(0);
    el.remove();
  });

  it('enters edit mode (username only) and shows Guardar when the edit icon is clicked', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const editButton = el.shadowRoot!.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editButton.click();
    await flush();

    const saveButton = el.shadowRoot!.querySelector('[data-action="save"]') as HTMLButtonElement;
    expect(saveButton).not.toBeNull();
    const row = saveButton.closest('tr')!;
    expect(row.querySelectorAll('input').length).toBe(1);
    el.remove();
  });

  it('persists an inline username edit and updates the table without reload', async () => {
    let updated: { id: number; username?: string } | null = null;
    const el = mount(
      makeTeacherService({ update: async (id, data) => { updated = { id, ...data }; return { ok: true, item: { id, username: data.username ?? '', role: 'profesor', passwordStatus: 'default', accountLocked: false, failedLoginAttempts: 0, modules: [] } }; } }),
      makeLegislationService(),
      makeCycleService(),
      makeModuleService(),
    );
    await flush();

    const editButton = el.shadowRoot!.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editButton.click();
    await flush();

    const input = el.shadowRoot!.querySelector('tbody tr input') as HTMLInputElement;
    input.value = 'juanfordrenamed';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const saveButton = el.shadowRoot!.querySelector('[data-action="save"]') as HTMLButtonElement;
    saveButton.click();
    await flush();

    expect(updated).toEqual({ id: 1, username: 'juanfordrenamed' });
    el.remove();
  });

  it('shows a confirmation dialog and removes the row when delete is confirmed with no dependencies', async () => {
    window.confirm = mock(() => true);
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(window.confirm).toHaveBeenCalled();
    const table = el.shadowRoot!.querySelector('[data-element-id="46"]') as HTMLTableElement;
    expect(table.textContent).not.toContain('juanford');
    el.remove();
  });

  it('blocks deletion when the teacher has correction records and shows an error', async () => {
    window.confirm = mock(() => true);
    const el = mount(
      makeTeacherService({ delete: async () => ({ ok: false, status: 409, code: 'HAS_DEPENDANTS' }) }),
      makeLegislationService(),
      makeCycleService(),
      makeModuleService(),
    );
    await flush();

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(el.shadowRoot!.textContent).toMatch(/correcciones/i);
    const table = el.shadowRoot!.querySelector('[data-element-id="46"]') as HTMLTableElement;
    expect(table.textContent).toContain('juanford');
    el.remove();
  });
});
