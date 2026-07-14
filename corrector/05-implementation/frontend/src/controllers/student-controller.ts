import type { Student, StudentService } from '../services/student.service';
import type { LegislationService } from '../services/legislation.service';
import type { CycleService } from '../services/cycle.service';
import type { ModuleService } from '../services/module.service';
import { NameCascadeControllerBase } from './name-cascade-controller-base';
import type { EntityServiceResult, DeleteServiceResult } from './name-cascade-controller-base';
import type { NameCascadeRow } from './name-cascade-crud-form';

const MIN_NAME_LENGTH = 2;
const MAX_NAME_LENGTH = 100;

export type StudentRow = NameCascadeRow<Student>;

export type UploadState =
  | { status: 'success'; created: number }
  | { status: 'error'; message: string };

export class StudentController extends NameCascadeControllerBase<Student> {
  constructor(
    private readonly studentService: StudentService,
    legislationService: LegislationService,
    cycleService: CycleService,
    moduleService: ModuleService,
  ) {
    super(legislationService, cycleService, moduleService);
  }

  protected _validateName(name: string): boolean {
    return name.length >= MIN_NAME_LENGTH && name.length <= MAX_NAME_LENGTH;
  }

  protected async _createEntity(name: string, _yearRaw: string, cycleIdRaw: string, moduleIdRaw: string): Promise<EntityServiceResult<Student>> {
    return this.studentService.create({ name, cycleId: Number(cycleIdRaw), moduleId: Number(moduleIdRaw) });
  }

  protected _createErrorMessage(): string {
    return 'No se pudo guardar el alumno';
  }

  protected async _updateEntity(id: number, name: string): Promise<EntityServiceResult<Student>> {
    return this.studentService.update(id, { name });
  }

  protected _updateErrorMessage(): string {
    return 'No se pudo actualizar el alumno';
  }

  protected async _deleteEntity(id: number): Promise<DeleteServiceResult> {
    return this.studentService.delete(id);
  }

  protected _deleteBlockedMessage(): string {
    return 'No se puede eliminar: el alumno está asignado a un proyecto.';
  }

  protected _deleteErrorMessage(): string {
    return 'No se pudo eliminar el alumno';
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
