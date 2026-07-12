// sketchNumbers: 101, 102, 103, 104, 105

import { describe, it, expect } from 'bun:test';
import type { CorrectionService } from '../src/services/correction.service';
import type { ProjectService } from '../src/services/project.service';
import type { ProjectStudentService } from '../src/services/project-student.service';
import type { RubricService } from '../src/services/rubric.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-correction-form';
import type { CorrectorCorrectionForm } from '../src/components/corrector-correction-form';

const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];
const MODULES = [{ id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' }];
const PROJECTS = [{ id: 1, name: 'Grupo 1', academicYear: '2024-2025', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 1 }];

function makeCorrectionService(overrides: Partial<CorrectionService> = {}): CorrectionService {
  return {
    findExisting: async () => ({ ok: true, item: null }),
    upsert: async () => ({ ok: false, status: 500, code: '' }),
    ...overrides,
  };
}

function makeProjectService(overrides: Partial<ProjectService> = {}): ProjectService {
  return {
    list: async () => ({ ok: true, items: PROJECTS }),
    create: async (data) => ({ ok: true, item: { id: 1, name: data.name, academicYear: data.academicYear, moduleId: data.moduleId, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', academicYear: '2024-2025', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeProjectStudentService(overrides: Partial<ProjectStudentService> = {}): ProjectStudentService {
  return {
    listForProject: async () => ({ ok: true, items: [{ studentId: 10, name: 'JJ499' }] }),
    assign: async () => ({ ok: true, projectId: 1, assigned: [], totalStudents: 0 }),
    unassign: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeRubricService(overrides: Partial<RubricService> = {}): RubricService {
  return {
    getForModule: async () => ({ ok: true, item: { id: 1, moduleId: 1, academicYear: '2024-2025', frozen: false, items: [] } }),
    addItem: async () => ({ ok: false, status: 500, code: '' }),
    updateItem: async () => ({ ok: false, status: 500, code: '' }),
    deleteItem: async () => ({ ok: true }),
    upload: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeLegislationService(overrides: Partial<LegislationService> = {}): LegislationService {
  return {
    list: async () => ({ ok: true, items: LEGISLATIONS }),
    create: async (name, startYear) => ({ ok: true, item: { id: 1, name, startYear } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', startYear: data.startYear ?? 0 } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeCycleService(overrides: Partial<CycleService> = {}): CycleService {
  return {
    list: async () => ({ ok: true, items: [{ id: 1, name: 'DAW' }] }),
    create: async (name) => ({ ok: true, item: { id: 1, name } }),
    update: async (id, name) => ({ ok: true, item: { id, name } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeModuleService(overrides: Partial<ModuleService> = {}): ModuleService {
  return {
    list: async () => ({ ok: true, items: MODULES }),
    create: async (data) => ({ ok: true, item: { id: 1, ...data, cycleName: '', legislationName: '' } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', weeklyHours: data.weeklyHours ?? 0, cycleId: data.cycleId ?? 0, cycleName: '', legislationId: data.legislationId ?? 0, legislationName: '' } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function mount(
  correctionService: CorrectionService,
  projectService: ProjectService,
  projectStudentService: ProjectStudentService,
  rubricService: RubricService,
  legislationService: LegislationService,
  cycleService: CycleService,
  moduleService: ModuleService,
): CorrectorCorrectionForm {
  const el = document.createElement('corrector-correction-form') as CorrectorCorrectionForm;
  el.correctionService = correctionService;
  el.projectService = projectService;
  el.projectStudentService = projectStudentService;
  el.rubricService = rubricService;
  el.legislationService = legislationService;
  el.cycleService = cycleService;
  el.moduleService = moduleService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function selectCascadeUpToModule(el: CorrectorCorrectionForm): Promise<void> {
  const year = el.shadowRoot!.querySelector('[data-element-id="101"]') as HTMLSelectElement;
  year.value = '2020';
  year.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  const legislation = el.shadowRoot!.querySelector('[data-element-id="102"]') as HTMLSelectElement;
  legislation.value = '1';
  legislation.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  const cycle = el.shadowRoot!.querySelector('[data-element-id="103"]') as HTMLSelectElement;
  cycle.value = '1';
  cycle.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
}

describe('Elements #101-105 — corrector-correction-form: module/project cascade', () => {
  it('#102/#103/#104/#105 start disabled and enable as the cascade fills in', async () => {
    const el = mount(makeCorrectionService(), makeProjectService(), makeProjectStudentService(), makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="102"]') as HTMLSelectElement).disabled).toBe(true);
    expect((el.shadowRoot!.querySelector('[data-element-id="105"]') as HTMLSelectElement).disabled).toBe(true);

    await selectCascadeUpToModule(el);
    const module = el.shadowRoot!.querySelector('[data-element-id="104"]') as HTMLSelectElement;
    module.value = '1';
    module.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="105"]') as HTMLSelectElement).disabled).toBe(false);
    const projectOption = Array.from((el.shadowRoot!.querySelector('[data-element-id="105"]') as HTMLSelectElement).options).find((o) => o.value === '1');
    expect(projectOption?.textContent).toBe('Grupo 1');
    el.remove();
  });

  it('selecting a project with a rubric loads the correction table and student checkboxes', async () => {
    const items = [{ id: 1, description: 'Item A', displayOrder: 1, levels: [{ id: 1, name: 'Excelente', score: 2, displayOrder: 1 }, { id: 2, name: 'Mal', score: 0, displayOrder: 2 }] }];
    const el = mount(
      makeCorrectionService(), makeProjectService(),
      makeProjectStudentService({ listForProject: async () => ({ ok: true, items: [{ studentId: 10, name: 'JJ499' }] }) }),
      makeRubricService({ getForModule: async () => ({ ok: true, item: { id: 5, moduleId: 1, academicYear: '2024-2025', frozen: false, items } }) }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectCascadeUpToModule(el);
    const module = el.shadowRoot!.querySelector('[data-element-id="104"]') as HTMLSelectElement;
    module.value = '1';
    module.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const project = el.shadowRoot!.querySelector('[data-element-id="105"]') as HTMLSelectElement;
    project.value = '1';
    project.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="110"]') as HTMLTableElement;
    expect(table.textContent).toContain('Item A');
    const studentCheckbox = el.shadowRoot!.querySelector('[data-element-id="107"]') as HTMLInputElement;
    expect(studentCheckbox).not.toBeNull();
    el.remove();
  });

  it('shows a warning and no table when the module has no rubric', async () => {
    const el = mount(
      makeCorrectionService(), makeProjectService(), makeProjectStudentService(),
      makeRubricService({ getForModule: async () => ({ ok: false, status: 404, code: 'NOT_FOUND' }) }),
      makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectCascadeUpToModule(el);
    const module = el.shadowRoot!.querySelector('[data-element-id="104"]') as HTMLSelectElement;
    module.value = '1';
    module.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();
    const project = el.shadowRoot!.querySelector('[data-element-id="105"]') as HTMLSelectElement;
    project.value = '1';
    project.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect(el.shadowRoot!.textContent).toContain('no tiene rúbrica');
    expect(el.shadowRoot!.querySelector('[data-element-id="110"]')).toBeNull();
    el.remove();
  });
});
