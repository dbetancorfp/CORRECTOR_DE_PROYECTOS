import type { CycleRepository, CycleFilters, Cycle } from '../cycle.repository';
import type { Store } from './store';
import { nextId } from './store';

export class InMemoryCycleRepository implements CycleRepository {
  constructor(private readonly store: Store) {}

  async findAll(filters: CycleFilters = {}): Promise<Cycle[]> {
    let list = this.store.cycles;
    if (filters.name !== undefined) {
      const q = filters.name.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }
    if (filters.legislationId !== undefined) {
      const cids = this.store.modules
        .filter((m) => m.legislationId === filters.legislationId)
        .map((m) => m.cycleId);
      list = list.filter((c) => cids.includes(c.id));
    }
    if (filters.year !== undefined) {
      const legIds = this.store.legislations
        .filter((l) => l.startYear === filters.year)
        .map((l) => l.id);
      const cids = this.store.modules
        .filter((m) => legIds.includes(m.legislationId))
        .map((m) => m.cycleId);
      list = list.filter((c) => cids.includes(c.id));
    }
    return list;
  }

  async findById(id: number): Promise<Cycle | null> {
    return this.store.cycles.find((c) => c.id === id) ?? null;
  }

  async findByName(name: string): Promise<Cycle | null> {
    return this.store.cycles.find((c) => c.name === name) ?? null;
  }

  async create(name: string): Promise<Cycle> {
    const cycle: Cycle = { id: nextId(this.store, 'cycle'), name };
    this.store.cycles.push(cycle);
    return cycle;
  }

  async update(id: number, name: string): Promise<Cycle> {
    const cycle = this.store.cycles.find((c) => c.id === id);
    if (!cycle) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    cycle.name = name;
    return cycle;
  }

  async delete(id: number): Promise<void> {
    const idx = this.store.cycles.findIndex((c) => c.id === id);
    if (idx < 0) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    this.store.cycles.splice(idx, 1);
  }

  async hasModules(id: number): Promise<boolean> {
    return this.store.modules.some((m) => m.cycleId === id);
  }
}
