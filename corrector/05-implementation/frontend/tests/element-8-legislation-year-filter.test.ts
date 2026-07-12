// sketchNumber: 8

import { describe, it, expect } from 'bun:test';
import type { LegislationService } from '../src/services/legislation.service';
import '../src/components/corrector-legislation-form';
import type { CorrectorLegislationForm } from '../src/components/corrector-legislation-form';

const ROWS = [
  { id: 1, name: 'LOE', startYear: 2006 },
  { id: 2, name: 'LOMLOE', startYear: 2020 },
];

function makeService(overrides: Partial<LegislationService> = {}): LegislationService {
  return {
    list: async () => ({ ok: true, items: ROWS }),
    create: async (name, startYear) => ({ ok: true, item: { id: 9, name, startYear } }),
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

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('Element #8 — corrector-legislation-form: filtro por año de inicio', () => {
  it('shows all rows when the filter is empty', async () => {
    const el = mount(makeService());
    await flush();
    const table = el.shadowRoot!.querySelector('[data-element-id="10"]') as HTMLTableElement;
    expect(table.textContent).toContain('LOE');
    expect(table.textContent).toContain('LOMLOE');
    el.remove();
  });

  it('filters rows by year substring after the debounce', async () => {
    const el = mount(makeService());
    await flush();
    const filter = el.shadowRoot!.querySelector('[data-element-id="8"]') as HTMLInputElement;
    filter.value = '2020';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);

    const table = el.shadowRoot!.querySelector('[data-element-id="10"]') as HTMLTableElement;
    expect(table.textContent).toContain('LOMLOE');
    expect(table.querySelectorAll('tbody tr').length).toBe(1);
    el.remove();
  });

  it('restores all rows when the filter is cleared', async () => {
    const el = mount(makeService());
    await flush();
    const filter = el.shadowRoot!.querySelector('[data-element-id="8"]') as HTMLInputElement;
    filter.value = '2020';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);
    filter.value = '';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    await wait(350);

    const table = el.shadowRoot!.querySelector('[data-element-id="10"]') as HTMLTableElement;
    expect(table.textContent).toContain('LOE');
    expect(table.textContent).toContain('LOMLOE');
    el.remove();
  });
});
