import type {
  TeacherRepository,
  TeacherFilters,
  TeacherListItem,
  AuthTeacher,
  CreateTeacherData,
} from '../teacher.repository';
import type { Store, TeacherFull } from './store';
import { nextId } from './store';

export class InMemoryTeacherRepository implements TeacherRepository {
  constructor(private readonly store: Store) {}

  async findAll(filters: TeacherFilters = {}): Promise<TeacherListItem[]> {
    let list = this.store.teachers;
    if (filters.moduleId !== undefined) {
      const tids = this.store.moduleTeachers
        .filter((mt) => mt.moduleId === filters.moduleId)
        .map((mt) => mt.teacherId);
      list = list.filter((t) => tids.includes(t.id));
    }
    if (filters.cycleId !== undefined) {
      const mids = this.store.modules
        .filter((m) => m.cycleId === filters.cycleId)
        .map((m) => m.id);
      const tids = this.store.moduleTeachers
        .filter((mt) => mids.includes(mt.moduleId))
        .map((mt) => mt.teacherId);
      list = list.filter((t) => tids.includes(t.id));
    }
    if (filters.legislationId !== undefined) {
      const mids = this.store.modules
        .filter((m) => m.legislationId === filters.legislationId)
        .map((m) => m.id);
      const tids = this.store.moduleTeachers
        .filter((mt) => mids.includes(mt.moduleId))
        .map((mt) => mt.teacherId);
      list = list.filter((t) => tids.includes(t.id));
    }
    if (filters.year !== undefined) {
      const legIds = this.store.legislations
        .filter((l) => l.startYear === filters.year)
        .map((l) => l.id);
      const mids = this.store.modules
        .filter((m) => legIds.includes(m.legislationId))
        .map((m) => m.id);
      const tids = this.store.moduleTeachers
        .filter((mt) => mids.includes(mt.moduleId))
        .map((mt) => mt.teacherId);
      list = list.filter((t) => tids.includes(t.id));
    }
    return list.map((t) => this._toListItem(t));
  }

  async findById(id: number): Promise<AuthTeacher | null> {
    return this.store.teachers.find((t) => t.id === id) ?? null;
  }

  async findByUsername(username: string): Promise<AuthTeacher | null> {
    return this.store.teachers.find((t) => t.username === username) ?? null;
  }

  async save(data: CreateTeacherData): Promise<TeacherListItem> {
    const id = nextId(this.store, 'teacher');
    const teacher: TeacherFull = {
      id,
      username: data.username,
      passwordHash: data.passwordHash,
      role: data.role,
      passwordStatus: 'default',
      accountLocked: false,
      failedLoginAttempts: 0,
      mustChangePassword: data.mustChangePassword,
      tutorOfCycleId: null,
      modules: [],
    };
    this.store.teachers.push(teacher);
    if (data.moduleId !== undefined) {
      this.store.moduleTeachers.push({ moduleId: data.moduleId, teacherId: id });
      const mod = this.store.modules.find((m) => m.id === data.moduleId);
      if (mod) teacher.modules = [{ id: mod.id, name: mod.name }];
    }
    return this._toListItem(teacher);
  }

  async update(id: number, data: Partial<CreateTeacherData>): Promise<TeacherListItem> {
    const t = this.store.teachers.find((t) => t.id === id);
    if (!t) throw new Error('NOT_FOUND');
    if (data.username) t.username = data.username;
    return this._toListItem(t);
  }

  async delete(id: number): Promise<void> {
    const idx = this.store.teachers.findIndex((t) => t.id === id);
    if (idx >= 0) this.store.teachers.splice(idx, 1);
    this.store.moduleTeachers = this.store.moduleTeachers.filter((mt) => mt.teacherId !== id);
  }

  async hasCorrections(id: number): Promise<boolean> {
    return this.store.corrections.some((c) => {
      const mids = this.store.moduleTeachers
        .filter((mt) => mt.teacherId === id)
        .map((mt) => mt.moduleId);
      return mids.includes(c.moduleId as number);
    });
  }

  async updateFailedAttempts(id: number, count: number): Promise<void> {
    const t = this.store.teachers.find((t) => t.id === id);
    if (t) t.failedLoginAttempts = count;
  }

  async resetFailedAttempts(id: number): Promise<void> {
    const t = this.store.teachers.find((t) => t.id === id);
    if (t) {
      t.failedLoginAttempts = 0;
      t.accountLocked = false;
    }
  }

  async lockAccount(id: number): Promise<void> {
    const t = this.store.teachers.find((t) => t.id === id);
    if (t) t.accountLocked = true;
  }

  async updatePassword(id: number, newHash: string): Promise<void> {
    const t = this.store.teachers.find((t) => t.id === id);
    if (t) {
      t.passwordHash = newHash;
      t.mustChangePassword = false;
      t.passwordStatus = 'changed';
    }
  }

  private _toListItem(t: TeacherFull): TeacherListItem {
    const mids = this.store.moduleTeachers
      .filter((mt) => mt.teacherId === t.id)
      .map((mt) => mt.moduleId);
    const modules = this.store.modules
      .filter((m) => mids.includes(m.id))
      .map((m) => ({ id: m.id, name: m.name }));
    return {
      id: t.id,
      username: t.username,
      role: t.role,
      passwordStatus: t.passwordStatus,
      accountLocked: t.accountLocked,
      failedLoginAttempts: t.failedLoginAttempts,
      modules,
    };
  }
}
