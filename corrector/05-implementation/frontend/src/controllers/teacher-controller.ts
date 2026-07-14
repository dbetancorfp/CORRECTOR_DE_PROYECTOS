import type { Teacher, TeacherService } from '../services/teacher.service';
import type { LegislationService } from '../services/legislation.service';
import type { CycleService } from '../services/cycle.service';
import type { ModuleService } from '../services/module.service';
import { CascadeQueries } from './cascade-queries';

const MIN_USERNAME_LENGTH = 4;
const MAX_USERNAME_LENGTH = 20;
const MIN_PASSWORD_LENGTH = 8;

export interface TeacherRow extends Teacher {
  cycleName: string | null;
  legislationName: string | null;
  startYear: number | null;
}

export interface FieldErrors {
  username: boolean;
  password: boolean;
  year: boolean;
  legislation: boolean;
  cycle: boolean;
  module: boolean;
}

export type SaveState =
  | { status: 'success'; item: Teacher }
  | { status: 'validation-error'; errors: FieldErrors }
  | { status: 'error'; message: string };

export type DeleteState =
  | { status: 'success' }
  | { status: 'blocked'; message: string }
  | { status: 'error'; message: string };

export type UnlockState =
  | { status: 'success' }
  | { status: 'error'; message: string };

function validateUsername(username: string): boolean {
  return username.length >= MIN_USERNAME_LENGTH && username.length <= MAX_USERNAME_LENGTH;
}

function validatePassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}

export class TeacherController extends CascadeQueries {
  constructor(
    private readonly teacherService: TeacherService,
    legislationService: LegislationService,
    cycleService: CycleService,
    moduleService: ModuleService,
  ) {
    super(legislationService, cycleService, moduleService);
  }

  async list(): Promise<TeacherRow[]> {
    return this.filterRows('', '', '', '');
  }

  async create(
    username: string,
    password: string,
    yearRaw: string,
    legislationIdRaw: string,
    cycleIdRaw: string,
    moduleIdRaw: string,
  ): Promise<SaveState> {
    const errors: FieldErrors = {
      username: !validateUsername(username),
      password: !validatePassword(password),
      year: yearRaw.trim() === '',
      legislation: legislationIdRaw.trim() === '',
      cycle: cycleIdRaw.trim() === '',
      module: moduleIdRaw.trim() === '',
    };
    if (Object.values(errors).some(Boolean)) {
      return { status: 'validation-error', errors };
    }

    const result = await this.teacherService.create({ username, password, moduleId: Number(moduleIdRaw) });
    if (result.ok) return { status: 'success', item: result.item };

    if (result.code === 'DUPLICATE') {
      return { status: 'error', message: `El usuario '${username}' ya existe` };
    }
    return { status: 'error', message: 'No se pudo guardar el profesor' };
  }

  async update(id: number, username: string): Promise<SaveState> {
    const errors: FieldErrors = {
      username: !validateUsername(username),
      password: false,
      year: false,
      legislation: false,
      cycle: false,
      module: false,
    };
    if (errors.username) {
      return { status: 'validation-error', errors };
    }

    const result = await this.teacherService.update(id, { username });
    if (result.ok) return { status: 'success', item: result.item };

    if (result.code === 'DUPLICATE') {
      return { status: 'error', message: `El usuario '${username}' ya existe` };
    }
    return { status: 'error', message: 'No se pudo actualizar el profesor' };
  }

  async delete(id: number): Promise<DeleteState> {
    const result = await this.teacherService.delete(id);
    if (result.ok) return { status: 'success' };

    if (result.code === 'HAS_DEPENDANTS') {
      return {
        status: 'blocked',
        message: 'No se puede eliminar: existen correcciones registradas.',
      };
    }
    return { status: 'error', message: 'No se pudo eliminar el profesor' };
  }

  async unlock(id: number): Promise<UnlockState> {
    const result = await this.teacherService.unlock(id);
    if (result.ok) return { status: 'success' };
    return { status: 'error', message: 'No se pudo desbloquear la cuenta' };
  }

  async filterRows(
    yearQuery: string,
    legislationQuery: string,
    cycleQuery: string,
    moduleQuery: string,
  ): Promise<TeacherRow[]> {
    const [teachersResult, modulesResult, legislations] = await Promise.all([
      this.teacherService.list(),
      this.moduleService.list(),
      this.loadLegislations(),
    ]);
    const teachers = teachersResult.ok ? teachersResult.items : [];
    const modules = modulesResult.ok ? modulesResult.items : [];
    const startYearById = new Map(legislations.map((l) => [l.id, l.startYear]));
    const moduleById = new Map(modules.map((m) => [m.id, m]));

    const year = yearQuery.trim();
    const legislation = legislationQuery.trim().toLowerCase();
    const cycle = cycleQuery.trim().toLowerCase();
    const module = moduleQuery.trim().toLowerCase();

    return teachers
      .map((teacher): TeacherRow => {
        const primaryModule = teacher.modules.length > 0 ? moduleById.get(teacher.modules[0]!.id) : undefined;
        const startYear = primaryModule ? startYearById.get(primaryModule.legislationId) ?? null : null;
        return {
          ...teacher,
          cycleName: primaryModule?.cycleName ?? null,
          legislationName: primaryModule?.legislationName ?? null,
          startYear,
        };
      })
      .filter((row) => (year === '' || (row.startYear !== null && String(row.startYear).includes(year)))
        && (legislation === '' || (row.legislationName?.toLowerCase().includes(legislation) ?? false))
        && (cycle === '' || (row.cycleName?.toLowerCase().includes(cycle) ?? false))
        && (module === '' || row.modules.some((m) => m.name.toLowerCase().includes(module))));
  }
}
