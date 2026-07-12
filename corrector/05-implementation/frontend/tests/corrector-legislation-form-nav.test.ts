// Nav/logout/tab-bar chrome added to corrector-legislation-form — not tied to
// a single boceto sketchNumber (the boceto repeats this block per screen file;
// see sketchNumbers 4-10 for the screen's own element tests).

import { describe, it, expect } from 'bun:test';
import type { LegislationService } from '../src/services/legislation.service';
import '../src/components/corrector-legislation-form';
import type { CorrectorLegislationForm } from '../src/components/corrector-legislation-form';

function makeService(overrides: Partial<LegislationService> = {}): LegislationService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (name, startYear) => ({ ok: true, item: { id: 1, name, startYear } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', startYear: data.startYear ?? 0 } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function mount(legislationService: LegislationService): CorrectorLegislationForm {
  const el = document.createElement('corrector-legislation-form') as CorrectorLegislationForm;
  el.legislationService = legislationService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('corrector-legislation-form: shared nav chrome', () => {
  it('renders a Salir button that dispatches corrector:logout when clicked', async () => {
    const el = mount(makeService());
    await flush();

    let logoutDispatched = false;
    document.addEventListener('corrector:logout', () => { logoutDispatched = true; });

    const salir = el.shadowRoot!.querySelector('[data-action="logout"]') as HTMLButtonElement;
    expect(salir).not.toBeNull();
    salir.click();

    expect(logoutDispatched).toBe(true);
    el.remove();
  });

  it('renders the 4-tab bar with Legislación active, Ciclos/Módulos clickable, Profesorado disabled', async () => {
    const el = mount(makeService());
    await flush();

    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(4);

    const legislacionTab = el.shadowRoot!.querySelector('[data-element-id="4"]') as HTMLButtonElement;
    expect(legislacionTab.getAttribute('aria-selected')).toBe('true');
    expect(legislacionTab.disabled).toBe(false);

    const ciclosTab = Array.from(tabs).find((tab) => tab.textContent?.trim() === 'Ciclos') as HTMLButtonElement;
    const modulosTab = Array.from(tabs).find((tab) => tab.textContent?.trim() === 'Módulos') as HTMLButtonElement;
    expect(ciclosTab.disabled).toBe(false);
    expect(modulosTab.disabled).toBe(false);
    const disabledTabs = Array.from(tabs).filter((tab) => (tab as HTMLButtonElement).disabled);
    expect(disabledTabs.length).toBe(1);
    el.remove();
  });

  it('dispatches corrector:admin-nav-selected with /admin/ciclos when the Ciclos tab is clicked', async () => {
    const el = mount(makeService());
    await flush();

    let navigateDetail: { to: string } | null = null;
    document.addEventListener('corrector:admin-nav-selected', (e) => {
      navigateDetail = (e as CustomEvent<{ to: string }>).detail;
    });

    const tabs = el.shadowRoot!.querySelectorAll('[role="tab"]');
    const ciclosTab = Array.from(tabs).find((tab) => tab.textContent?.trim() === 'Ciclos') as HTMLButtonElement;
    ciclosTab.click();

    expect(navigateDetail).toEqual({ to: '/admin/ciclos' });
    el.remove();
  });
});
