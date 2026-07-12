// sketchNumber: 5

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

describe('Element #5 — corrector-legislation-form: siglas field', () => {
  it('shows an error state when submitted empty', async () => {
    const el = mount(makeService());
    await flush();
    const year = el.shadowRoot!.querySelector('[data-element-id="6"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="7"]') as HTMLButtonElement;
    year.value = '2020';
    year.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
    await flush();

    const name = el.shadowRoot!.querySelector('[data-element-id="5"]') as HTMLInputElement;
    expect(name.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });

  it('shows an error state when the abbreviation contains lowercase letters', async () => {
    const el = mount(makeService());
    await flush();
    const name = el.shadowRoot!.querySelector('[data-element-id="5"]') as HTMLInputElement;
    const year = el.shadowRoot!.querySelector('[data-element-id="6"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="7"]') as HTMLButtonElement;
    name.value = 'lomloe';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    year.value = '2020';
    year.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
    await flush();

    expect(name.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });

  it('accepts a valid uppercase abbreviation between 2 and 10 characters', async () => {
    let created: { name: string; startYear: number } | null = null;
    const el = mount(makeService({
      create: async (name, startYear) => { created = { name, startYear }; return { ok: true, item: { id: 9, name, startYear } }; },
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

    expect(created).toEqual({ name: 'LOE', startYear: 2006 });
    el.remove();
  });

  it('shows an "already exists" error when the abbreviation is duplicated', async () => {
    const el = mount(makeService({
      create: async () => ({ ok: false, status: 409, code: 'DUPLICATE' }),
    }));
    await flush();
    const name = el.shadowRoot!.querySelector('[data-element-id="5"]') as HTMLInputElement;
    const year = el.shadowRoot!.querySelector('[data-element-id="6"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="7"]') as HTMLButtonElement;
    name.value = 'LOMLOE';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    year.value = '2020';
    year.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
    await flush();

    expect(el.shadowRoot!.textContent).toMatch(/ya existe/i);
    el.remove();
  });
});
