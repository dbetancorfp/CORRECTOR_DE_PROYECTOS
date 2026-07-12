// Nav/logout/tab-bar chrome — not tied to a single boceto sketchNumber (same
// category as corrector-legislation-form-nav.test.ts).

import { describe, it, expect } from 'bun:test';
import type { CycleService } from '../src/services/cycle.service';
import type { LegislationService } from '../src/services/legislation.service';
import '../src/components/corrector-cycles-form';
import type { CorrectorCyclesForm } from '../src/components/corrector-cycles-form';

function makeCycleService(overrides: Partial<CycleService> = {}): CycleService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (name) => ({ ok: true, item: { id: 1, name } }),
    update: async (id, name) => ({ ok: true, item: { id, name } }),
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

function mount(cycleService: CycleService, legislationService: LegislationService): CorrectorCyclesForm {
  const el = document.createElement('corrector-cycles-form') as CorrectorCyclesForm;
  el.cycleService = cycleService;
  el.legislationService = legislationService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('corrector-cycles-form: shared nav chrome', () => {
  it('renders a Salir button that dispatches corrector:logout when clicked', async () => {
    const el = mount(makeCycleService(), makeLegislationService());
    await flush();

    let logoutDispatched = false;
    document.addEventListener('corrector:logout', () => { logoutDispatched = true; });

    const salir = el.shadowRoot!.querySelector('[data-action="logout"]') as HTMLButtonElement;
    expect(salir).not.toBeNull();
    salir.click();

    expect(logoutDispatched).toBe(true);
    el.remove();
  });

  it('renders the 4-tab bar with Ciclos active, Legislación/Módulos clickable, Profesorado disabled', async () => {
    const el = mount(makeCycleService(), makeLegislationService());
    await flush();

    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(4);

    const ciclosTab = el.shadowRoot!.querySelector('[data-element-id="12"]') as HTMLButtonElement;
    expect(ciclosTab.getAttribute('aria-selected')).toBe('true');
    expect(ciclosTab.disabled).toBe(false);

    const legislacionTab = Array.from(tabs).find((tab) => tab.textContent?.trim() === 'Legislación') as HTMLButtonElement;
    const modulosTab = Array.from(tabs).find((tab) => tab.textContent?.trim() === 'Módulos') as HTMLButtonElement;
    expect(legislacionTab.disabled).toBe(false);
    expect(modulosTab.disabled).toBe(false);
    const disabledTabs = Array.from(tabs).filter((tab) => (tab as HTMLButtonElement).disabled);
    expect(disabledTabs.length).toBe(1);
    el.remove();
  });

  it('dispatches corrector:admin-nav-selected with /admin/legislacion when the Legislación tab is clicked', async () => {
    const el = mount(makeCycleService(), makeLegislationService());
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
