// Nav/logout chrome — not tied to a single boceto sketchNumber.

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

function makeCorrectionService(overrides: Partial<CorrectionService> = {}): CorrectionService {
  return {
    findExisting: async () => ({ ok: true, item: null }),
    upsert: async () => ({ ok: false, status: 500, code: '' }),
    ...overrides,
  };
}

function makeProjectService(overrides: Partial<ProjectService> = {}): ProjectService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (data) => ({ ok: true, item: { id: 1, name: data.name, academicYear: data.academicYear, moduleId: data.moduleId, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', academicYear: '2024-2025', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

function makeProjectStudentService(overrides: Partial<ProjectStudentService> = {}): ProjectStudentService {
  return {
    listForProject: async () => ({ ok: true, items: [] }),
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

describe('corrector-correction-form: nav chrome', () => {
  it('dispatches corrector:logout when Salir is clicked', async () => {
    const el = mount(makeCorrectionService(), makeProjectService(), makeProjectStudentService(), makeRubricService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    let logoutFired = false;
    document.addEventListener('corrector:logout', () => { logoutFired = true; }, { once: true });

    const button = el.shadowRoot!.querySelector('[data-action="logout"]') as HTMLButtonElement;
    button.click();

    expect(logoutFired).toBe(true);
    el.remove();
  });
});
