// sketchNumber: 16

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
    list: async () => ({ ok: true, items: [{ id: 1, name: 'LOE', startYear: 2006 }] }),
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

async function fillValidForm(el: CorrectorCyclesForm): Promise<void> {
  const name = el.shadowRoot!.querySelector('[data-element-id="13"]') as HTMLInputElement;
  name.value = 'Desarrollo de Aplicaciones Web';
  name.dispatchEvent(new Event('input', { bubbles: true }));
  const year = el.shadowRoot!.querySelector('[data-element-id="14"]') as HTMLSelectElement;
  year.value = '2006';
  year.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  const legislation = el.shadowRoot!.querySelector('[data-element-id="15"]') as HTMLSelectElement;
  legislation.value = '1';
  legislation.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Element #16 — corrector-cycles-form: Guardar button', () => {
  it('clears the form and adds the new row to the table on success', async () => {
    const el = mount(makeCycleService({ create: async (name) => ({ ok: true, item: { id: 5, name } }) }), makeLegislationService());
    await flush();
    await fillValidForm(el);

    const button = el.shadowRoot!.querySelector('[data-element-id="16"]') as HTMLButtonElement;
    button.click();
    await flush();

    const nameAfter = el.shadowRoot!.querySelector('[data-element-id="13"]') as HTMLInputElement;
    expect(nameAfter.value).toBe('');
    const table = el.shadowRoot!.querySelector('[data-element-id="20"]') as HTMLTableElement;
    expect(table.textContent).toContain('Desarrollo de Aplicaciones Web');
    el.remove();
  });

  it('shows a loading state while the request is in flight', async () => {
    let resolveCreate: (() => void) | null = null;
    const el = mount(
      makeCycleService({
        create: (name) => new Promise((resolve) => {
          resolveCreate = () => resolve({ ok: true, item: { id: 1, name } });
        }),
      }),
      makeLegislationService(),
    );
    await flush();
    await fillValidForm(el);

    const button = el.shadowRoot!.querySelector('[data-element-id="16"]') as HTMLButtonElement;
    button.click();
    await Promise.resolve();

    const buttonWhileLoading = el.shadowRoot!.querySelector('[data-element-id="16"]') as HTMLButtonElement;
    expect(buttonWhileLoading.disabled).toBe(true);

    resolveCreate!();
    await flush();
    el.remove();
  });
});
