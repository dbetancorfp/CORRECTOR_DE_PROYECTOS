// sketchNumber: 54

import { describe, it, expect } from 'bun:test';
import type { StudentService } from '../src/services/student.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-students-form';
import type { CorrectorStudentsForm } from '../src/components/corrector-students-form';

function makeStudentService(overrides: Partial<StudentService> = {}): StudentService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async () => ({ ok: true, item: { id: 1, name: 'Nuevo', cycleId: 1, cycleName: 'DAW', modules: [] } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', cycleId: 1, cycleName: 'DAW', modules: [] } }),
    delete: async () => ({ ok: true }),
    upload: async () => ({ ok: true, created: 2 }),
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

function makeCycleService(overrides: Partial<CycleService> = {}): CycleService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (name) => ({ ok: true, item: { id: 1, name } }),
    update: async (id, name) => ({ ok: true, item: { id, name } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeModuleService(overrides: Partial<ModuleService> = {}): ModuleService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (data) => ({ ok: true, item: { id: 1, ...data, cycleName: '', legislationName: '' } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', weeklyHours: data.weeklyHours ?? 0, cycleId: data.cycleId ?? 0, cycleName: '', legislationId: data.legislationId ?? 0, legislationName: '' } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function mount(
  studentService: StudentService,
  legislationService: LegislationService,
  cycleService: CycleService,
  moduleService: ModuleService,
): CorrectorStudentsForm {
  const el = document.createElement('corrector-students-form') as CorrectorStudentsForm;
  el.studentService = studentService;
  el.legislationService = legislationService;
  el.cycleService = cycleService;
  el.moduleService = moduleService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function selectFile(input: HTMLInputElement, file: File): void {
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('Element #54 — corrector-students-form: Subir lista de alumnos', () => {
  it('accepts csv, json and yaml via the accept attribute', async () => {
    const el = mount(makeStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const input = el.shadowRoot!.querySelector('[data-element-id="54"]') as HTMLInputElement;
    expect(input.accept).toContain('.csv');
    expect(input.accept).toContain('.json');
    expect(input.accept).toContain('.yaml');
    el.remove();
  });

  it('uploads the selected file and reloads the table on success', async () => {
    let uploadedFile: File | null = null;
    const el = mount(
      makeStudentService({
        upload: async (file) => { uploadedFile = file; return { ok: true, created: 2 }; },
        list: async () => ({ ok: true, items: [{ id: 1, name: 'JJ499', cycleId: 1, cycleName: 'DAW', modules: [] }] }),
      }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();

    const input = el.shadowRoot!.querySelector('[data-element-id="54"]') as HTMLInputElement;
    const file = new File(['nombre\nJJ499'], 'alumnos.csv', { type: 'text/csv' });
    selectFile(input, file);
    await flush();

    expect(uploadedFile).toBe(file);
    const table = el.shadowRoot!.querySelector('[data-element-id="60"]') as HTMLTableElement;
    expect(table.textContent).toContain('JJ499');
    el.remove();
  });

  it('shows an error toast and does not touch the table when the upload fails', async () => {
    const el = mount(
      makeStudentService({ upload: async () => ({ ok: false, status: 422, message: 'Formato de fichero inválido' }) }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();

    const input = el.shadowRoot!.querySelector('[data-element-id="54"]') as HTMLInputElement;
    selectFile(input, new File(['bad'], 'alumnos.txt', { type: 'text/plain' }));
    await flush();

    expect(el.shadowRoot!.textContent).toContain('Formato de fichero inválido');
    el.remove();
  });
});
