// sketchNumber: 20

import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import type { CycleService } from '../src/services/cycle.service';
import type { LegislationService } from '../src/services/legislation.service';
import '../src/components/corrector-cycles-form';
import type { CorrectorCyclesForm } from '../src/components/corrector-cycles-form';

const ROWS = [
  { id: 1, name: 'Desarrollo de Aplicaciones Web' },
  { id: 2, name: 'Administración de Sistemas' },
];

function makeCycleService(overrides: Partial<CycleService> = {}): CycleService {
  return {
    list: async () => ({ ok: true, items: ROWS }),
    create: async (name) => ({ ok: true, item: { id: 9, name } }),
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

let originalConfirm: typeof window.confirm;

beforeEach(() => {
  originalConfirm = window.confirm;
});

afterEach(() => {
  window.confirm = originalConfirm;
});

describe('Element #20 — corrector-cycles-form: tabla de ciclos', () => {
  it('loads and displays all existing cycles on mount, without an Año finalización column', async () => {
    const el = mount(makeCycleService(), makeLegislationService());
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="20"]') as HTMLTableElement;
    expect(table.textContent).toContain('Desarrollo de Aplicaciones Web');
    expect(table.textContent).toContain('Administración de Sistemas');
    expect(table.textContent).not.toMatch(/Año finalización/i);
    el.remove();
  });

  it('shows an empty state message when no cycles exist', async () => {
    const el = mount(makeCycleService({ list: async () => ({ ok: true, items: [] }) }), makeLegislationService());
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="20"]') as HTMLTableElement;
    expect(table.querySelectorAll('tbody tr').length).toBe(0);
    expect(el.shadowRoot!.textContent).toMatch(/no hay ciclos/i);
    el.remove();
  });

  it('enters edit mode and shows Guardar when the edit icon is clicked', async () => {
    const el = mount(makeCycleService(), makeLegislationService());
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
    let updated: { id: number; name: string } | null = null;
    const el = mount(
      makeCycleService({ update: async (id, name) => { updated = { id, name }; return { ok: true, item: { id, name } }; } }),
      makeLegislationService(),
    );
    await flush();

    const editButton = el.shadowRoot!.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editButton.click();
    await flush();

    const nameInput = el.shadowRoot!.querySelector('tbody tr input') as HTMLInputElement;
    nameInput.value = 'Desarrollo de Aplicaciones Multiplataforma';
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));

    const saveButton = el.shadowRoot!.querySelector('[data-action="save"]') as HTMLButtonElement;
    saveButton.click();
    await flush();

    expect(updated).toEqual({ id: 1, name: 'Desarrollo de Aplicaciones Multiplataforma' });
    el.remove();
  });

  it('shows a confirmation dialog and removes the row when delete is confirmed with no dependencies', async () => {
    window.confirm = mock(() => true);
    const el = mount(makeCycleService(), makeLegislationService());
    await flush();

    const deleteButtons = el.shadowRoot!.querySelectorAll('[data-action="delete"]');
    (deleteButtons[1] as HTMLButtonElement).click();
    await flush();

    expect(window.confirm).toHaveBeenCalled();
    const table = el.shadowRoot!.querySelector('[data-element-id="20"]') as HTMLTableElement;
    expect(table.textContent).not.toContain('Administración de Sistemas');
    el.remove();
  });

  it('blocks deletion when the cycle has dependent modules and shows an error', async () => {
    window.confirm = mock(() => true);
    const el = mount(
      makeCycleService({ delete: async () => ({ ok: false, status: 409, code: 'HAS_DEPENDANTS' }) }),
      makeLegislationService(),
    );
    await flush();

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(el.shadowRoot!.textContent).toMatch(/módulos|dependientes/i);
    const table = el.shadowRoot!.querySelector('[data-element-id="20"]') as HTMLTableElement;
    expect(table.textContent).toContain('Desarrollo de Aplicaciones Web');
    el.remove();
  });
});
