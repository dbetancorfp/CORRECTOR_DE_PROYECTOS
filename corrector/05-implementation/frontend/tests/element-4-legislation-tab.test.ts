// sketchNumber: 4

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

describe('Element #4 — corrector-legislation-form: Legislación tab', () => {
  it('renders the tab as selected when the screen is mounted', async () => {
    const el = mount(makeService());
    await Promise.resolve();
    await Promise.resolve();

    const tab = el.shadowRoot!.querySelector('[data-element-id="4"]') as HTMLButtonElement;
    expect(tab).not.toBeNull();
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(tab.textContent).toContain('Legislación');
    el.remove();
  });
});
