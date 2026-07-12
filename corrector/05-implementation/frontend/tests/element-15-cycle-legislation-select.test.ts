// sketchNumber: 15

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
    list: async () => ({
      ok: true,
      items: [
        { id: 1, name: 'LOE', startYear: 2006 },
        { id: 2, name: 'LOMLOE', startYear: 2020 },
        { id: 3, name: 'LOGSE', startYear: 2006 },
      ],
    }),
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

describe('Element #15 — corrector-cycles-form: selector legislación (navegación)', () => {
  it('is disabled until a year is selected in #14', async () => {
    const el = mount(makeCycleService(), makeLegislationService());
    await flush();

    const legislation = el.shadowRoot!.querySelector('[data-element-id="15"]') as HTMLSelectElement;
    expect(legislation.disabled).toBe(true);
    el.remove();
  });

  it('offers only legislations matching the year selected in #14', async () => {
    const el = mount(makeCycleService(), makeLegislationService());
    await flush();

    const year = el.shadowRoot!.querySelector('[data-element-id="14"]') as HTMLSelectElement;
    year.value = '2006';
    year.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const legislation = el.shadowRoot!.querySelector('[data-element-id="15"]') as HTMLSelectElement;
    expect(legislation.disabled).toBe(false);
    const names = Array.from(legislation.options).filter((o) => o.value !== '').map((o) => o.textContent);
    expect(names.sort()).toEqual(['LOE', 'LOGSE']);
    el.remove();
  });

  it('shows an error state when submitted without a legislation selected', async () => {
    const el = mount(makeCycleService(), makeLegislationService());
    await flush();

    const name = el.shadowRoot!.querySelector('[data-element-id="13"]') as HTMLInputElement;
    name.value = 'Desarrollo de Aplicaciones Web';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    const year = el.shadowRoot!.querySelector('[data-element-id="14"]') as HTMLSelectElement;
    year.value = '2006';
    year.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const button = el.shadowRoot!.querySelector('[data-element-id="16"]') as HTMLButtonElement;
    button.click();
    await flush();

    const legislation = el.shadowRoot!.querySelector('[data-element-id="15"]') as HTMLSelectElement;
    expect(legislation.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });
});
