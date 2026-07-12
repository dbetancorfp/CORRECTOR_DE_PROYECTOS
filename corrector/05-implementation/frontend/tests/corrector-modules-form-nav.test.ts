// Nav/logout/tab-bar chrome — not tied to a single boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import type { ModuleService } from '../src/services/module.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import '../src/components/corrector-modules-form';
import type { CorrectorModulesForm } from '../src/components/corrector-modules-form';

function makeModuleService(overrides: Partial<ModuleService> = {}): ModuleService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (data) => ({ ok: true, item: { id: 1, ...data, cycleName: '', legislationName: '' } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', weeklyHours: data.weeklyHours ?? 0, cycleId: data.cycleId ?? 0, cycleName: '', legislationId: data.legislationId ?? 0, legislationName: '' } }),
    delete: async () => ({ ok: true }),
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

function mount(moduleService: ModuleService, legislationService: LegislationService, cycleService: CycleService): CorrectorModulesForm {
  const el = document.createElement('corrector-modules-form') as CorrectorModulesForm;
  el.moduleService = moduleService;
  el.legislationService = legislationService;
  el.cycleService = cycleService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('corrector-modules-form: shared nav chrome', () => {
  it('renders a Salir button that dispatches corrector:logout when clicked', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    let logoutDispatched = false;
    document.addEventListener('corrector:logout', () => { logoutDispatched = true; });

    const salir = el.shadowRoot!.querySelector('[data-action="logout"]') as HTMLButtonElement;
    expect(salir).not.toBeNull();
    salir.click();

    expect(logoutDispatched).toBe(true);
    el.remove();
  });

  it('renders the 4-tab bar with Módulos active and the other 3 implemented/known tabs clickable', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
    await flush();

    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(4);

    const modulosTab = el.shadowRoot!.querySelector('[data-element-id="22"]') as HTMLButtonElement;
    expect(modulosTab.getAttribute('aria-selected')).toBe('true');
    expect(modulosTab.disabled).toBe(false);

    const legislacionTab = Array.from(tabs).find((tab) => tab.textContent?.trim() === 'Legislación') as HTMLButtonElement;
    const ciclosTab = Array.from(tabs).find((tab) => tab.textContent?.trim() === 'Ciclos') as HTMLButtonElement;
    expect(legislacionTab.disabled).toBe(false);
    expect(ciclosTab.disabled).toBe(false);

    const profesoradoTab = Array.from(tabs).find((tab) => tab.textContent?.trim() === 'Profesorado') as HTMLButtonElement;
    expect(profesoradoTab.disabled).toBe(true);
    el.remove();
  });

  it('dispatches corrector:admin-nav-selected with /admin/legislacion when the Legislación tab is clicked', async () => {
    const el = mount(makeModuleService(), makeLegislationService(), makeCycleService());
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
