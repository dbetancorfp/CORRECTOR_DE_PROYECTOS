import type {
  LegislationRepository,
  LegislationFilters,
  Legislation,
} from '../legislation.repository';
import type { Store } from './store';
import { nextId } from './store';

export class InMemoryLegislationRepository implements LegislationRepository {
  constructor(private readonly store: Store) {}

  async findAll(filters: LegislationFilters = {}): Promise<Legislation[]> {
    let list = this.store.legislations;
    if (filters.year !== undefined) {
      list = list.filter((l) => l.startYear === filters.year);
    }
    if (filters.name !== undefined) {
      const q = filters.name.toLowerCase();
      list = list.filter((l) => l.name.toLowerCase().includes(q));
    }
    return list;
  }

  async findById(id: number): Promise<Legislation | null> {
    return this.store.legislations.find((l) => l.id === id) ?? null;
  }

  async findByName(name: string): Promise<Legislation | null> {
    return this.store.legislations.find((l) => l.name === name) ?? null;
  }

  async create(name: string, startYear: number): Promise<Legislation> {
    const leg: Legislation = { id: nextId(this.store, 'legislation'), name, startYear };
    this.store.legislations.push(leg);
    return leg;
  }

  async update(id: number, data: Partial<{ name: string; startYear: number }>): Promise<Legislation> {
    const leg = this.store.legislations.find((l) => l.id === id);
    if (!leg) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    if (data.name !== undefined) leg.name = data.name;
    if (data.startYear !== undefined) leg.startYear = data.startYear;
    return leg;
  }

  async delete(id: number): Promise<void> {
    const idx = this.store.legislations.findIndex((l) => l.id === id);
    if (idx < 0) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    this.store.legislations.splice(idx, 1);
  }

  async hasModules(id: number): Promise<boolean> {
    return this.store.modules.some((m) => m.legislationId === id);
  }
}
