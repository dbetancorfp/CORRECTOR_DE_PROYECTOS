// sketchNumber: 7

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

describe('Element #7 — corrector-legislation-form: Guardar button', () => {
  it('clears the form and adds the new row to the table on success', async () => {
    const el = mount(makeService({
      create: async (name, startYear) => ({ ok: true, item: { id: 5, name, startYear } }),
    }));
    await flush();
    const name = el.shadowRoot!.querySelector('[data-element-id="5"]') as HTMLInputElement;
    const year = el.shadowRoot!.querySelector('[data-element-id="6"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="7"]') as HTMLButtonElement;
    name.value = 'LOE';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    year.value = '2006';
    year.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
    await flush();

    const nameAfter = el.shadowRoot!.querySelector('[data-element-id="5"]') as HTMLInputElement;
    expect(nameAfter.value).toBe('');
    const table = el.shadowRoot!.querySelector('[data-element-id="10"]') as HTMLTableElement;
    expect(table.textContent).toContain('LOE');
    el.remove();
  });

  it('shows a loading state while the request is in flight', async () => {
    let resolveCreate: (() => void) | null = null;
    const el = mount(makeService({
      create: () => new Promise((resolve) => {
        resolveCreate = () => resolve({ ok: true, item: { id: 1, name: 'LOE', startYear: 2006 } });
      }),
    }));
    await flush();
    const name = el.shadowRoot!.querySelector('[data-element-id="5"]') as HTMLInputElement;
    const year = el.shadowRoot!.querySelector('[data-element-id="6"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="7"]') as HTMLButtonElement;
    name.value = 'LOE';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    year.value = '2006';
    year.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
    await Promise.resolve();

    const buttonWhileLoading = el.shadowRoot!.querySelector('[data-element-id="7"]') as HTMLButtonElement;
    expect(buttonWhileLoading.disabled).toBe(true);

    resolveCreate!();
    await flush();
    el.remove();
  });
});
