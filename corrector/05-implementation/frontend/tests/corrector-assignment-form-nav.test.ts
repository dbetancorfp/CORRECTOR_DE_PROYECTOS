// Nav/logout/tab-bar chrome — not tied to a single boceto sketchNumber.

import { describe, it, expect } from 'bun:test';
import type { ProjectService } from '../src/services/project.service';
import type { StudentService } from '../src/services/student.service';
import type { ProjectStudentService } from '../src/services/project-student.service';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import '../src/components/corrector-assignment-form';
import type { CorrectorAssignmentForm } from '../src/components/corrector-assignment-form';

function makeProjectService(overrides: Partial<ProjectService> = {}): ProjectService {
  return {
    list: async () => ({ ok: true, items: [] }),
    create: async (data) => ({ ok: true, item: { id: 1, name: data.name, academicYear: data.academicYear, moduleId: data.moduleId, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', academicYear: '2020-2021', moduleId: 1, moduleName: 'DEW', cycleName: 'DAW', studentCount: 0 } }),
    delete: async () => ({ ok: true }),
    ...overrides,
  };
}

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

function makeProjectStudentService(overrides: Partial<ProjectStudentService> = {}): ProjectStudentService {
  return {
    listForProject: async () => ({ ok: true, items: [] }),
    assign: async () => ({ ok: true, projectId: 1, assigned: [], totalStudents: 0 }),
    unassign: async () => ({ ok: true }),
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
  projectService: ProjectService,
  studentService: StudentService,
  projectStudentService: ProjectStudentService,
  legislationService: LegislationService,
  cycleService: CycleService,
  moduleService: ModuleService,
): CorrectorAssignmentForm {
  const el = document.createElement('corrector-assignment-form') as CorrectorAssignmentForm;
  el.projectService = projectService;
  el.studentService = studentService;
  el.projectStudentService = projectStudentService;
  el.legislationService = legislationService;
  el.cycleService = cycleService;
  el.moduleService = moduleService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('corrector-assignment-form: nav chrome', () => {
  it('dispatches corrector:logout when Salir is clicked', async () => {
    const el = mount(makeProjectService(), makeStudentService(), makeProjectStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    let logoutFired = false;
    document.addEventListener('corrector:logout', () => { logoutFired = true; }, { once: true });

    const button = el.shadowRoot!.querySelector('[data-action="logout"]') as HTMLButtonElement;
    button.click();

    expect(logoutFired).toBe(true);
    el.remove();
  });

  it('renders the Asignación tab as active and Rúbrica as disabled', async () => {
    const el = mount(makeProjectService(), makeStudentService(), makeProjectStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    const asignacion = el.shadowRoot!.querySelector('[data-action="tab-asignacion"]') as HTMLButtonElement;
    expect(asignacion.getAttribute('aria-selected')).toBe('true');

    const rubrica = el.shadowRoot!.querySelector('[data-action="tab-rubrica"]') as HTMLButtonElement;
    expect(rubrica.disabled).toBe(true);
    el.remove();
  });

  it('navigates to /profesor/gestionar/proyectos when the Proyectos tab is clicked', async () => {
    const el = mount(makeProjectService(), makeStudentService(), makeProjectStudentService(), makeLegislationService(), makeCycleService(), makeModuleService());
    await flush();

    let navigatedTo: string | null = null;
    el.addEventListener('corrector:gestion-nav-selected', (e) => {
      navigatedTo = (e as CustomEvent<{ to: string }>).detail.to;
    });

    const proyectos = el.shadowRoot!.querySelector('[data-action="tab-proyectos"]') as HTMLButtonElement;
    proyectos.click();

    expect(navigatedTo).toBe('/profesor/gestionar/proyectos');
    el.remove();
  });
});
