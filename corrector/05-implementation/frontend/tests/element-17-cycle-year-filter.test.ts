// sketchNumber: 17

import { describe, it, expect } from 'bun:test';
import type { CycleService } from '../src/services/cycle.service';
import type { LegislationService } from '../src/services/legislation.service';
import '../src/components/corrector-cycles-form';
import type { CorrectorCyclesForm } from '../src/components/corrector-cycles-form';

const LEGISLATIONS = [
  { id: 1, name: 'LOE', startYear: 2006 },
  { id: 2, name: 'LOMLOE', startYear: 2020 },
];

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
    list: async () => ({ ok: true, items: LEGISLATIONS }),
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Element #17 — corrector-cycles-form: filtro por año (JOIN vía módulos)', () => {
  it('resolves the year to matching legislations and merges cycles from each after the debounce', async () => {
    const el = mount(
      makeCycleService({
        list: async (filters) => {
          if (filters?.legislationId === 2) return { ok: true, items: [{ id: 10, name: 'DAW' }] };
          return { ok: true, items: [] };
        },
      }),
      makeLegislationService(),
    );
    await flush();

    const filter = el.shadowRoot!.querySelector('[data-element-id="17"]') as HTMLInputElement;
    filter.value = '2020';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="20"]') as HTMLTableElement;
    expect(table.textContent).toContain('DAW');
    el.remove();
  });

  it('restores all rows when the filter is cleared', async () => {
    const el = mount(
      makeCycleService({ list: async () => ({ ok: true, items: [{ id: 1, name: 'DAW' }, { id: 2, name: 'ASIR' }] }) }),
      makeLegislationService(),
    );
    await flush();

    const filter = el.shadowRoot!.querySelector('[data-element-id="17"]') as HTMLInputElement;
    filter.value = '2020';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);
    filter.value = '';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="20"]') as HTMLTableElement;
    expect(table.textContent).toContain('DAW');
    expect(table.textContent).toContain('ASIR');
    el.remove();
  });
});
