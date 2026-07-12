// sketchNumber: 60

import { describe, it, expect } from 'bun:test';
import type { StudentService } from '../src/services/student.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-students-form';
import type { CorrectorStudentsForm } from '../src/components/corrector-students-form';

const STUDENTS = [
  { id: 1, name: 'JJ499', cycleId: 1, cycleName: 'DAW', modules: [{ id: 1, name: 'DEW' }] },
];

function makeStudentService(overrides: Partial<StudentService> = {}): StudentService {
  return {
    list: async () => ({ ok: true, items: STUDENTS }),
    create: async () => ({ ok: true, item: { id: 1, name: 'Nuevo', cycleId: 1, cycleName: 'DAW', modules: [] } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', cycleId: 1, cycleName: 'DAW', modules: [{ id: 1, name: 'DEW' }] } }),
    delete: async () => ({ ok: true }),
    upload: async () => ({ ok: true, created: 0 }),
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

describe('Element #60 — corrector-students-form: students table', () => {
  it('shows an empty state when there are no students', async () => {
    const el = mount(makeStudentService({ list: async () => ({ ok: true, items: [] }) }), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect(el.shadowRoot!.textContent).toContain('No hay alumnos registrados');
    el.remove();
  });

  it('edits a student inline and persists the new name', async () => {
    let updated: { id: number; name?: string } | null = null;
    const el = mount(
      makeStudentService({ update: async (id, data) => { updated = { id, name: data.name }; return { ok: true, item: { id, name: data.name ?? '', cycleId: 1, cycleName: 'DAW', modules: [{ id: 1, name: 'DEW' }] } }; } }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();

    const editButton = el.shadowRoot!.querySelector('[data-action="edit"]') as HTMLButtonElement;
    editButton.click();
    await flush();

    const input = el.shadowRoot!.querySelector('tbody input') as HTMLInputElement;
    input.value = 'Editado';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    const saveButton = el.shadowRoot!.querySelector('[data-action="save"]') as HTMLButtonElement;
    saveButton.click();
    await flush();

    expect(updated).toEqual({ id: 1, name: 'Editado' });
    el.remove();
  });

  it('deletes a student after confirmation', async () => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    let deletedId: number | null = null;
    const el = mount(
      makeStudentService({ delete: async (id) => { deletedId = id; return { ok: true }; } }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(deletedId).toBe(1);
    window.confirm = originalConfirm;
    el.remove();
  });

  it('shows a blocked error message when deleting a student assigned to a project', async () => {
    const originalConfirm = window.confirm;
    window.confirm = () => true;
    const el = mount(
      makeStudentService({ delete: async () => ({ ok: false, status: 409, code: 'HAS_DEPENDANTS' }) }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();

    const deleteButton = el.shadowRoot!.querySelector('[data-action="delete"]') as HTMLButtonElement;
    deleteButton.click();
    await flush();

    expect(el.shadowRoot!.textContent).toContain('asignado a un proyecto');
    window.confirm = originalConfirm;
    el.remove();
  });
});
