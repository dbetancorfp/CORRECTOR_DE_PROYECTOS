import type { Student, StudentService } from '../services/student.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import type { Module, ModuleService } from '../services/module.service';
import * as cascade from './academic-cascade';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

export interface StudentRow extends Student {
  legislationName: string | null;
  startYear: number | null;
}

export interface FieldErrors {
  name: boolean;
  year: boolean;
  legislation: boolean;
  cycle: boolean;
  module: boolean;
}

export type SaveState =
  | { status: 'success'; item: Student }
  | { status: 'validation-error'; errors: FieldErrors }
  | { status: 'error'; message: string };

export type DeleteState =
  | { status: 'success' }
  | { status: 'blocked'; message: string }
  | { status: 'error'; message: string };

export type UploadState =
  | { status: 'success'; created: number }
  | { status: 'error'; message: string };

function validateName(name: string): boolean {
  return name.length >= MIN_NAME_LENGTH && name.length <= MAX_NAME_LENGTH;
}

export class StudentController {
  constructor(
    private readonly studentService: StudentService,
    private readonly legislationService: LegislationService,
    private readonly cycleService: CycleService,
    private readonly moduleService: ModuleService,
  ) {}

  async list(): Promise<StudentRow[]> {
    return this.filterRows('', '', '', '', '');
  }

  async loadLegislations(): Promise<Legislation[]> {
    return cascade.loadLegislations(this.legislationService);
  }

  async loadYearOptions(): Promise<number[]> {
    return cascade.loadYearOptions(this.legislationService);
  }

  async loadLegislationOptions(year: number | null): Promise<Legislation[]> {
    return cascade.loadLegislationOptions(this.legislationService, year);
  }

  async loadCycleOptions(legislationId: number | null): Promise<Cycle[]> {
    return cascade.loadCycleOptions(this.cycleService, legislationId);
  }

  async loadModuleOptions(cycleId: number | null): Promise<Module[]> {
    return cascade.loadModuleOptions(this.moduleService, cycleId);
  }

  async create(
    name: string,
    yearRaw: string,
    legislationIdRaw: string,
    cycleIdRaw: string,
    moduleIdRaw: string,
  ): Promise<SaveState> {
    const errors: FieldErrors = {
      name: !validateName(name),
      year: yearRaw.trim() === '',
      legislation: legislationIdRaw.trim() === '',
      cycle: cycleIdRaw.trim() === '',
      module: moduleIdRaw.trim() === '',
    };
    if (Object.values(errors).some(Boolean)) {
      return { status: 'validation-error', errors };
    }

    const result = await this.studentService.create({
      name,
      cycleId: Number(cycleIdRaw),
      moduleId: Number(moduleIdRaw),
    });
    if (result.ok) return { status: 'success', item: result.item };
    return { status: 'error', message: 'No se pudo guardar el alumno' };
  }

  async update(id: number, name: string): Promise<SaveState> {
    const errors: FieldErrors = { name: !validateName(name), year: false, legislation: false, cycle: false, module: false };
    if (errors.name) {
      return { status: 'validation-error', errors };
    }

    const result = await this.studentService.update(id, { name });
    if (result.ok) return { status: 'success', item: result.item };
    return { status: 'error', message: 'No se pudo actualizar el alumno' };
  }

  async delete(id: number): Promise<DeleteState> {
    const result = await this.studentService.delete(id);
    if (result.ok) return { status: 'success' };

    if (result.code === 'HAS_DEPENDANTS') {
      return {
        status: 'blocked',
        message: 'No se puede eliminar: el alumno está asignado a un proyecto.',
      };
    }
    return { status: 'error', message: 'No se pudo eliminar el alumno' };
  }

  async upload(file: File): Promise<UploadState> {
    const result = await this.studentService.upload(file);
    if (result.ok) return { status: 'success', created: result.created };
    return { status: 'error', message: result.message };
  }

  async filterRows(
    nameQuery: string,
    yearQuery: string,
    legislationQuery: string,
    cycleQuery: string,
    moduleQuery: string,
  ): Promise<StudentRow[]> {
    const [studentsResult, modulesResult, legislations] = await Promise.all([
      this.studentService.list(),
      this.moduleService.list(),
      this.loadLegislations(),
    ]);
    const students = studentsResult.ok ? studentsResult.items : [];
    const modules = modulesResult.ok ? modulesResult.items : [];
    const startYearById = new Map(legislations.map((l) => [l.id, l.startYear]));
    const moduleById = new Map(modules.map((m) => [m.id, m]));

    const name = nameQuery.trim().toLowerCase();
    const year = yearQuery.trim();
    const legislation = legislationQuery.trim().toLowerCase();
    const cycle = cycleQuery.trim().toLowerCase();
    const module = moduleQuery.trim().toLowerCase();

    return students
      .map((student): StudentRow => {
        const primaryModule = student.modules.length > 0 ? moduleById.get(student.modules[0]!.id) : undefined;
        const startYear = primaryModule ? startYearById.get(primaryModule.legislationId) ?? null : null;
        return {
          ...student,
          legislationName: primaryModule?.legislationName ?? null,
          startYear,
        };
      })
      .filter((row) => (name === '' || row.name.toLowerCase().includes(name))
        && (year === '' || (row.startYear !== null && String(row.startYear).includes(year)))
        && (legislation === '' || (row.legislationName?.toLowerCase().includes(legislation) ?? false))
        && (cycle === '' || row.cycleName.toLowerCase().includes(cycle))
        && (module === '' || row.modules.some((m) => m.name.toLowerCase().includes(module))));
  }
}
