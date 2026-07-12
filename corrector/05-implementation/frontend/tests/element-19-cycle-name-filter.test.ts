// sketchNumber: 19

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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Element #19 — corrector-cycles-form: filtro por nombre de ciclo', () => {
  it('queries the backend by name substring after the debounce, without a legislation lookup', async () => {
    let receivedFilters: unknown = undefined;
    const el = mount(
      makeCycleService({
        list: async (filters) => { receivedFilters = filters; return { ok: true, items: [{ id: 1, name: 'DAW' }] }; },
      }),
      makeLegislationService(),
    );
    await flush();

    const filter = el.shadowRoot!.querySelector('[data-element-id="19"]') as HTMLInputElement;
    filter.value = 'DAW';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);
    await flush();

    expect(receivedFilters).toEqual({ name: 'DAW' });
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

    const filter = el.shadowRoot!.querySelector('[data-element-id="19"]') as HTMLInputElement;
    filter.value = 'DAW';
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
