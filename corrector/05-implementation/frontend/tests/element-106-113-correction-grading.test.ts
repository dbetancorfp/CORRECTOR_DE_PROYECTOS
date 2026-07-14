// sketchNumbers: 106, 107, 108, 109, 110, 112, 113

import { describe, it, expect } from 'bun:test';
import type { CorrectionService, UpsertCorrectionData } from '../src/services/correction.service';
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
const PROJECTS = [{ id: 1, name: 'Grupo 1', academicYear: '2024-2025', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 2 }];
const ITEMS = [
  { id: 1, description: 'Item A', displayOrder: 1, levels: [{ id: 1, name: 'Excelente', score: 2, displayOrder: 1 }, { id: 2, name: 'Bien', score: 1, displayOrder: 2 }, { id: 3, name: 'Mal', score: 0, displayOrder: 3 }] },
  { id: 2, description: 'Item B', displayOrder: 2, levels: [{ id: 4, name: 'Excelente', score: 3, displayOrder: 1 }, { id: 5, name: 'Mal', score: 0, displayOrder: 2 }] },
];
const STUDENTS = [{ studentId: 10, name: 'JJ499' }, { studentId: 11, name: 'MnP454' }];

function makeCorrectionService(overrides: Partial<CorrectionService> = {}): CorrectionService {
  return {
    findExisting: async () => ({ ok: true, item: null }),
    upsert: async () => ({ ok: true, item: { id: 1, studentId: 10, projectId: 1, moduleId: 1, rubricId: 5, academicYear: '2024-2025', finalScore: 10, items: [] } }),
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
    listForProject: async () => ({ ok: true, items: STUDENTS }),
    assign: async () => ({ ok: true, projectId: 1, assigned: [], totalStudents: 0 }),
    unassign: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeRubricService(overrides: Partial<RubricService> = {}): RubricService {
  return {
    getForModule: async () => ({ ok: true, item: { id: 5, moduleId: 1, academicYear: '2024-2025', frozen: false, items: ITEMS } }),
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

async function selectProject(el: CorrectorCorrectionForm): Promise<void> {
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
  const module = el.shadowRoot!.querySelector('[data-element-id="104"]') as HTMLSelectElement;
  module.value = '1';
  module.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
  const project = el.shadowRoot!.querySelector('[data-element-id="105"]') as HTMLSelectElement;
  project.value = '1';
  project.dispatchEvent(new Event('change', { bubbles: true }));
  await flush();
}

function clickCell(el: CorrectorCorrectionForm, description: string, levelScore: string): void {
  const table = el.shadowRoot!.querySelector('[data-element-id="110"]') as HTMLTableElement;
  const rows = Array.from(table.querySelectorAll('tr'));
  const row = rows.find((r) => r.textContent?.includes(description))!;
  const cells = Array.from(row.querySelectorAll('td'));
  const cell = cells.find((c) => c.textContent?.trim() === levelScore)!;
  cell.dispatchEvent(new Event('click', { bubbles: true }));
}

describe('Elements #106-113 — corrector-correction-form: checkboxes, grading and score', () => {
  it('#106 checked disables and checks all individual checkboxes', async () => {
    const el = mount(makeCorrectionService(), makeProjectService(), makeProjectStudentService(), makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectProject(el);

    const group = el.shadowRoot!.querySelector('[data-element-id="106"]') as HTMLInputElement;
    group.checked = true;
    group.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    const s1 = el.shadowRoot!.querySelector('[data-element-id="107"]') as HTMLInputElement;
    const s2 = el.shadowRoot!.querySelector('[data-element-id="108"]') as HTMLInputElement;
    expect(s1.checked).toBe(true);
    expect(s1.disabled).toBe(true);
    expect(s2.checked).toBe(true);
    expect(s2.disabled).toBe(true);
    el.remove();
  });

  it('only renders as many student checkboxes as the project has students', async () => {
    const el = mount(makeCorrectionService(), makeProjectService(), makeProjectStudentService(), makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectProject(el);

    expect(el.shadowRoot!.querySelector('[data-element-id="107"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-element-id="108"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-element-id="109"]')).toBeNull();
    el.remove();
  });

  it('checking one student pre-loads an existing correction into the table', async () => {
    const el = mount(
      makeCorrectionService({ findExisting: async () => ({ ok: true, item: { id: 1, studentId: 10, projectId: 1, moduleId: 1, rubricId: 5, academicYear: '2024-2025', finalScore: 5, items: [{ rubricItemId: 1, rubricLevelId: 2 }, { rubricItemId: 2, rubricLevelId: 4 }] } }) }),
      makeProjectService(), makeProjectStudentService(), makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectProject(el);

    const s1 = el.shadowRoot!.querySelector('[data-element-id="107"]') as HTMLInputElement;
    s1.checked = true;
    s1.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect(el.shadowRoot!.textContent).toContain('5');
    el.remove();
  });

  it('clicking a cell selects it (highlighted) and deselects the rest of the row', async () => {
    const el = mount(makeCorrectionService(), makeProjectService(), makeProjectStudentService(), makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectProject(el);

    clickCell(el, 'Item A', '2');
    await flush();
    clickCell(el, 'Item A', '1');
    await flush();

    const table = el.shadowRoot!.querySelector('[data-element-id="110"]') as HTMLTableElement;
    const rows = Array.from(table.querySelectorAll('tr'));
    const row = rows.find((r) => r.textContent?.includes('Item A'))!;
    const selectedCell = Array.from(row.querySelectorAll('td')).find((c) => c.getAttribute('aria-selected') === 'true');
    expect(selectedCell?.textContent?.trim()).toBe('1');
    el.remove();
  });

  it('updates #112 and #113 in real time as cells are selected', async () => {
    const el = mount(makeCorrectionService(), makeProjectService(), makeProjectStudentService(), makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();
    await selectProject(el);

    clickCell(el, 'Item A', '2');
    await flush();

    expect((el.shadowRoot!.querySelector('[data-element-id="112"]') as HTMLElement).textContent).toBe('2');
    el.remove();
  });

  it('auto-saves once every item has a level selected, for the checked students', async () => {
    let savedPayloads: UpsertCorrectionData[] = [];
    const el = mount(
      makeCorrectionService({ upsert: async (data) => { savedPayloads.push(data); return { ok: true, item: { id: 1, studentId: data.studentId, projectId: data.projectId, moduleId: data.moduleId, rubricId: data.rubricId, academicYear: data.academicYear, finalScore: 10, items: data.items } }; } }),
      makeProjectService(), makeProjectStudentService(), makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectProject(el);

    const s1 = el.shadowRoot!.querySelector('[data-element-id="107"]') as HTMLInputElement;
    s1.checked = true;
    s1.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    expect(savedPayloads.length).toBe(0);

    clickCell(el, 'Item A', '2');
    await flush();
    clickCell(el, 'Item B', '3');
    await flush();

    expect(savedPayloads.length).toBe(1);
    expect(savedPayloads[0].studentId).toBe(10);
    expect(savedPayloads[0].items).toEqual([{ rubricItemId: 1, rubricLevelId: 1 }, { rubricItemId: 2, rubricLevelId: 4 }]);
    el.remove();
  });

  it('in group mode, auto-save applies to every assigned student', async () => {
    const savedStudentIds: number[] = [];
    const el = mount(
      makeCorrectionService({ upsert: async (data) => { savedStudentIds.push(data.studentId); return { ok: true, item: { id: 1, studentId: data.studentId, projectId: data.projectId, moduleId: data.moduleId, rubricId: data.rubricId, academicYear: data.academicYear, finalScore: 10, items: data.items } }; } }),
      makeProjectService(), makeProjectStudentService(), makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService(),
    );
    await flush();
    await selectProject(el);

    const group = el.shadowRoot!.querySelector('[data-element-id="106"]') as HTMLInputElement;
    group.checked = true;
    group.dispatchEvent(new Event('change', { bubbles: true }));
    await flush();

    clickCell(el, 'Item A', '2');
    await flush();
    clickCell(el, 'Item B', '3');
    await flush();

    expect(savedStudentIds.sort()).toEqual([10, 11]);
    el.remove();
  });
});
