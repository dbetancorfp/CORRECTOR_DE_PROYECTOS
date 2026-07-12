// sketchNumber: 13

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
    list: async () => ({ ok: true, items: [{ id: 1, name: 'LOMLOE', startYear: 2020 }] }),
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

function fill(el: CorrectorCyclesForm, id: string, value: string): void {
  const input = el.shadowRoot!.querySelector(`[data-element-id="${id}"]`) as HTMLInputElement | HTMLSelectElement;
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Element #13 — corrector-cycles-form: nombre del ciclo', () => {
  it('shows an error state when submitted empty', async () => {
    const el = mount(makeCycleService(), makeLegislationService());
    await flush();

    const button = el.shadowRoot!.querySelector('[data-element-id="16"]') as HTMLButtonElement;
    button.click();
    await flush();

    const name = el.shadowRoot!.querySelector('[data-element-id="13"]') as HTMLInputElement;
    expect(name.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });

  it('shows an error state when the name is shorter than 3 characters', async () => {
    const el = mount(makeCycleService(), makeLegislationService());
    await flush();
    fill(el, '13', 'DA');

    const button = el.shadowRoot!.querySelector('[data-element-id="16"]') as HTMLButtonElement;
    button.click();
    await flush();

    const name = el.shadowRoot!.querySelector('[data-element-id="13"]') as HTMLInputElement;
    expect(name.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });

  it('shows an "already exists" error when the name is duplicated', async () => {
    const el = mount(makeCycleService({ create: async () => ({ ok: false, status: 409, code: 'DUPLICATE' }) }), makeLegislationService());
    await flush();
    fill(el, '13', 'Desarrollo de Aplicaciones Web');
    fill(el, '14', '2020');
    await flush();
    fill(el, '15', '1');

    const button = el.shadowRoot!.querySelector('[data-element-id="16"]') as HTMLButtonElement;
    button.click();
    await flush();

    expect(el.shadowRoot!.textContent).toMatch(/ya existe/i);
    el.remove();
  });
});
