import { describe, it, expect } from 'bun:test';
import type { StudentService } from '../src/services/student.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import { StudentController } from '../src/controllers/student-controller';

// Exercises the año→legislación→ciclo→módulo delegation methods that
// NameCascadeControllerBase provides to every subclass (StudentController,
// ProjectController). corrector-students-form.ts itself never calls these —
// it drives its cascade <select>s through its own FormCascadeEngine instance
// — the only real caller is AssignmentController (corrector-assignment-form,
// #78-82), which was previously only covered end-to-end by Cypress, not by
// bun test. Covered here directly against one concrete subclass since the
// methods live in the shared base, not in StudentController itself.
const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];
const CYCLES = [{ id: 1, name: 'DAW' }];
const MODULES = [
  { id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' },
];

function makeStudentService(overrides: Partial<StudentService> = {}): StudentService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async () => ({ ok: true, item: { id: 1, name: 'Nuevo', cycleId: 1, cycleName: 'DAW', modules: [] } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', cycleId: 1, cycleName: 'DAW', modules: [] } }),
    delete: async () => ({ ok: true }),
    upload: async () => ({ ok: true, created: 0 }),
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
    list: async () => ({ ok: true, items: CYCLES }),
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

function makeController(): StudentController {
  return new StudentController(makeStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
}

describe('NameCascadeControllerBase cascade delegation', () => {
  it('loadYearOptions() returns the distinct sorted startYears from legislationService', async () => {
    const controller = makeController();
    expect(await controller.loadYearOptions()).toEqual([2020]);
  });

  it('loadLegislationOptions(year) filters legislations by startYear, [] when year is null', async () => {
    const controller = makeController();
    expect(await controller.loadLegislationOptions(2020)).toEqual(LEGISLATIONS);
    expect(await controller.loadLegislationOptions(null)).toEqual([]);
  });

  it('loadCycleOptions(legislationId) delegates to cycleService.list({legislationId}), [] when null', async () => {
    const controller = makeController();
    expect(await controller.loadCycleOptions(1)).toEqual(CYCLES);
    expect(await controller.loadCycleOptions(null)).toEqual([]);
  });

  it('loadModuleOptions(cycleId) filters modules by cycleId, [] when null', async () => {
    const controller = makeController();
    expect(await controller.loadModuleOptions(1)).toEqual(MODULES);
    expect(await controller.loadModuleOptions(null)).toEqual([]);
  });
});
