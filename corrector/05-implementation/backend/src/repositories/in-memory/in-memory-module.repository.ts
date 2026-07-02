import type {
  ModuleRepository,
  ModuleFilters,
  Module,
  CreateModuleData,
} from '../module.repository';
import type { Store } from './store';
import { nextId } from './store';

export class InMemoryModuleRepository implements ModuleRepository {
  constructor(private readonly store: Store) {}

  async findAll(filters: ModuleFilters = {}): Promise<Module[]> {
    let list = this.store.modules;
    if (filters.name !== undefined) {
      const q = filters.name.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    if (filters.cycleId !== undefined) {
      list = list.filter((m) => m.cycleId === filters.cycleId);
    }
    if (filters.legislationId !== undefined) {
      list = list.filter((m) => m.legislationId === filters.legislationId);
    }
    if (filters.teacherId !== undefined) {
      const mids = this.store.moduleTeachers
        .filter((mt) => mt.teacherId === filters.teacherId)
        .map((mt) => mt.moduleId);
      list = list.filter((m) => mids.includes(m.id));
    }
    if (filters.year !== undefined) {
      const legIds = this.store.legislations
        .filter((l) => l.startYear === filters.year)
        .map((l) => l.id);
      list = list.filter((m) => legIds.includes(m.legislationId));
    }
    return list;
  }

  async findById(id: number): Promise<Module | null> {
    return this.store.modules.find((m) => m.id === id) ?? null;
  }

  async findByNameAndCycle(
    name: string,
    cycleId: number,
    legislationId: number,
  ): Promise<Module | null> {
    return (
      this.store.modules.find(
        (m) => m.name === name && m.cycleId === cycleId && m.legislationId === legislationId,
      ) ?? null
    );
  }

  async create(data: CreateModuleData): Promise<Module> {
    const cycle = this.store.cycles.find((c) => c.id === data.cycleId);
    const leg = this.store.legislations.find((l) => l.id === data.legislationId);
    const mod: Module = {
      id: nextId(this.store, 'module'),
      name: data.name,
      weeklyHours: data.weeklyHours,
      cycleId: data.cycleId,
      cycleName: cycle?.name ?? '',
      legislationId: data.legislationId,
      legislationName: leg?.name ?? '',
    };
    this.store.modules.push(mod);
    return mod;
  }

  async update(id: number, data: Partial<CreateModuleData>): Promise<Module> {
    const mod = this.store.modules.find((m) => m.id === id);
    if (!mod) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    if (data.name !== undefined) mod.name = data.name;
    if (data.weeklyHours !== undefined) mod.weeklyHours = data.weeklyHours;
    return mod;
  }

  async delete(id: number): Promise<void> {
    const idx = this.store.modules.findIndex((m) => m.id === id);
    if (idx < 0) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    this.store.modules.splice(idx, 1);
    this.store.moduleTeachers = this.store.moduleTeachers.filter((mt) => mt.moduleId !== id);
  }

  async hasProjects(id: number): Promise<boolean> {
    return this.store.projects.some((p) => p.moduleId === id);
  }
}
