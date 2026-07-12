// sketchNumber: 6

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

describe('Element #6 — corrector-legislation-form: año de inicio field', () => {
  it('shows an error state when submitted empty', async () => {
    const el = mount(makeService());
    await flush();
    const name = el.shadowRoot!.querySelector('[data-element-id="5"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="7"]') as HTMLButtonElement;
    name.value = 'LOE';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
    await flush();

    const year = el.shadowRoot!.querySelector('[data-element-id="6"]') as HTMLInputElement;
    expect(year.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });

  it('shows an error state when the year is outside 1900-2099', async () => {
    const el = mount(makeService());
    await flush();
    const name = el.shadowRoot!.querySelector('[data-element-id="5"]') as HTMLInputElement;
    const year = el.shadowRoot!.querySelector('[data-element-id="6"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="7"]') as HTMLButtonElement;
    name.value = 'LOE';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    year.value = '1800';
    year.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
    await flush();

    expect(year.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });

  it('submits the form when Enter is pressed with a valid year', async () => {
    let submitted = false;
    const el = mount(makeService({
      create: async () => { submitted = true; return { ok: true, item: { id: 1, name: 'LOE', startYear: 2006 } }; },
    }));
    await flush();
    const name = el.shadowRoot!.querySelector('[data-element-id="5"]') as HTMLInputElement;
    const year = el.shadowRoot!.querySelector('[data-element-id="6"]') as HTMLInputElement;
    name.value = 'LOE';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    year.value = '2006';
    year.dispatchEvent(new Event('input', { bubbles: true }));
    year.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await flush();

    expect(submitted).toBe(true);
    el.remove();
  });
});
