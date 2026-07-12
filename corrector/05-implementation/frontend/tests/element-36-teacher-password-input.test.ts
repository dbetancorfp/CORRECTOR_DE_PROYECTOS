// sketchNumber: 36

import { describe, it, expect } from 'bun:test';
import type { TeacherService } from '../src/services/teacher.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-teachers-form';
import type { CorrectorTeachersForm } from '../src/components/corrector-teachers-form';

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
    list: async () => ({ ok: true, items: [{ id: 1, name: 'LOMLOE', startYear: 2020 }] }),
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

describe('Element #36 — corrector-teachers-form: contraseña', () => {
  it('always masks the password field characters', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const password = el.shadowRoot!.querySelector('[data-element-id="36"]') as HTMLInputElement;
    expect(password.getAttribute('type')).toBe('password');
    el.remove();
  });

  it('shows an error state when shorter than 8 characters', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const username = el.shadowRoot!.querySelector('[data-element-id="35"]') as HTMLInputElement;
    username.value = 'mariagon';
    username.dispatchEvent(new Event('input', { bubbles: true }));
    const password = el.shadowRoot!.querySelector('[data-element-id="36"]') as HTMLInputElement;
    password.value = 'short';
    password.dispatchEvent(new Event('input', { bubbles: true }));

    const button = el.shadowRoot!.querySelector('[data-element-id="41"]') as HTMLButtonElement;
    button.click();
    await flush();

    const passwordAfter = el.shadowRoot!.querySelector('[data-element-id="36"]') as HTMLInputElement;
    expect(passwordAfter.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });

  it('shows an error state when submitted empty', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const button = el.shadowRoot!.querySelector('[data-element-id="41"]') as HTMLButtonElement;
    button.click();
    await flush();

    const password = el.shadowRoot!.querySelector('[data-element-id="36"]') as HTMLInputElement;
    expect(password.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });
});
