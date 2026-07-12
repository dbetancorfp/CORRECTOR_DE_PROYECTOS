// Nav/logout/tab-bar chrome — not tied to a single boceto sketchNumber.

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
    list: async () => ({ ok: true, items: [] }),
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

describe('corrector-teachers-form: shared nav chrome', () => {
  it('renders a Salir button that dispatches corrector:logout when clicked', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    let logoutDispatched = false;
    document.addEventListener('corrector:logout', () => { logoutDispatched = true; });

    const salir = el.shadowRoot!.querySelector('[data-action="logout"]') as HTMLButtonElement;
    expect(salir).not.toBeNull();
    salir.click();

    expect(logoutDispatched).toBe(true);
    el.remove();
  });

  it('renders the 4-tab bar with Profesorado active and all other tabs clickable', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(4);

    const profesoradoTab = el.shadowRoot!.querySelector('[data-element-id="34"]') as HTMLButtonElement;
    expect(profesoradoTab.getAttribute('aria-selected')).toBe('true');
    expect(profesoradoTab.disabled).toBe(false);

    const disabledTabs = Array.from(tabs).filter((tab) => (tab as HTMLButtonElement).disabled);
    expect(disabledTabs.length).toBe(0);
    el.remove();
  });

  it('dispatches corrector:admin-nav-selected with /admin/legislacion when the Legislación tab is clicked', async () => {
    const el = mount(makeTeacherService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    let navigateDetail: { to: string } | null = null;
    document.addEventListener('corrector:admin-nav-selected', (e) => {
      navigateDetail = (e as CustomEvent<{ to: string }>).detail;
    });

    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    const legislacionTab = Array.from(tabs).find((tab) => tab.textContent?.trim() === 'Legislación') as HTMLButtonElement;
    legislacionTab.click();

    expect(navigateDetail).toEqual({ to: '/admin/legislacion' });
    el.remove();
  });
});
