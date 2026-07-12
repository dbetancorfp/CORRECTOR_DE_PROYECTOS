// sketchNumber: 10

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import type { LegislationService } from '../src/services/legislation.service';
import '../src/components/corrector-legislation-form';
import type { CorrectorLegislationForm } from '../src/components/corrector-legislation-form';

const ROWS = [
  { id: 1, name: 'LOMLOE', startYear: 2020 },
  { id: 2, name: 'LOGSE', startYear: 1990 },
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

let originalConfirm: typeof window.confirm;

beforeEach(() => {
  originalConfirm = window.confirm;
});

afterEach(() => {
  window.confirm = originalConfirm;
});

describe('Element #10 — corrector-legislation-form: tabla de legislaciones', () => {
  it('loads and displays all existing legislaciones on mount', async () => {
    const el = mount(makeService());
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="10"]') as HTMLTableElement;
    expect(table.textContent).toContain('LOMLOE');
    expect(table.textContent).toContain('LOGSE');
    el.remove();
  });

  it('shows an empty state message when no legislaciones exist', async () => {
    const el = mount(makeService({ list: async () => ({ ok: true, items: [] }) }));
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="10"]') as HTMLTableElement;
    expect(table.querySelectorAll('tbody tr').length).toBe(0);
    expect(el.shadowRoot!.textContent).toMatch(/no hay legislaciones/i);
    el.remove();
  });

  it('enters edit mode and shows Guardar when the edit icon is clicked', async () => {
    const el = mount(makeService());
    await flush();

    const editButton = el.shadowRoot!.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editButton.click();
    await flush();

    const saveButton = el.shadowRoot!.querySelector('[data-action="save"]') as HTMLButtonElement;
    expect(saveButton).not.toBeNull();
    expect(saveButton.textContent).toMatch(/guardar/i);
    el.remove();
  });

  it('persists an inline edit and updates the table without reload', async () => {
    let updated: { id: number; name?: string; startYear?: number } | null = null;
    const el = mount(makeService({
      update: async (id, data) => { updated = { id, ...data }; return { ok: true, item: { id, name: data.name ?? '', startYear: data.startYear ?? 0 } }; },
    }));
    await flush();

    const editButton = el.shadowRoot!.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editButton.click();
    await flush();

    const nameInput = el.shadowRoot!.querySelector('tbody tr input') as HTMLInputElement;
    nameInput.value = 'LOMLOE';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    const saveButton = el.shadowRoot!.querySelector('[data-action="save"]') as HTMLButtonElement;
    saveButton.click();
    await flush();

    expect(updated).not.toBeNull();
    expect(updated!.id).toBe(1);
    el.remove();
  });

  it('shows a confirmation dialog and removes the row when delete is confirmed with no dependencies', async () => {
    window.confirm = mock(() => true);
    const el = mount(makeService());
    await flush();

    const deleteButtons = el.shadowRoot!.querySelectorAll('[data-action="delete"]');
    (deleteButtons[1] as HTMLButtonElement).click(); // LOGSE — no modules
    await flush();

    expect(window.confirm).toHaveBeenCalled();
    const table = el.shadowRoot!.querySelector('[data-element-id="10"]') as HTMLTableElement;
    expect(table.textContent).not.toContain('LOGSE');
    el.remove();
  });

  it('does nothing when delete confirmation is dismissed', async () => {
    window.confirm = mock(() => false);
    let deleteCalled = false;
    const el = mount(makeService({
      delete: async () => { deleteCalled = true; return { ok: true }; },
    }));
    await flush();

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(deleteCalled).toBe(false);
    el.remove();
  });

  it('blocks deletion when the legislation has dependent modules and shows an error', async () => {
    window.confirm = mock(() => true);
    const el = mount(makeService({
      delete: async () => ({ ok: false, status: 409, code: 'HAS_DEPENDANTS' }),
    }));
    await flush();

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(el.shadowRoot!.textContent).toMatch(/módulos|dependientes/i);
    const table = el.shadowRoot!.querySelector('[data-element-id="10"]') as HTMLTableElement;
    expect(table.textContent).toContain('LOMLOE');
    el.remove();
  });
});
