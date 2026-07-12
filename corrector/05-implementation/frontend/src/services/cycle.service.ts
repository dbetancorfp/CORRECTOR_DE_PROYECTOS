export interface Cycle {
  id: number;
  name: string;
}

export interface ApiFailure {
  ok: false;
  status: number;
  code: string;
}

export interface ListSuccess {
  ok: true;
  items: Cycle[];
}

export interface ItemSuccess {
  ok: true;
  item: Cycle;
}

export interface DeleteSuccess {
  ok: true;
}

export type ListResult = ListSuccess | ApiFailure;
export type CreateResult = ItemSuccess | ApiFailure;
export type UpdateResult = ItemSuccess | ApiFailure;
export type DeleteResult = DeleteSuccess | ApiFailure;

export interface CycleListFilters {
  name?: string;
  legislationId?: number;
  year?: number;
}

export interface CycleService {
  list(filters?: CycleListFilters): Promise<ListResult>;
  create(name: string): Promise<CreateResult>;
  update(id: number, name: string): Promise<UpdateResult>;
  delete(id: number): Promise<DeleteResult>;
}

async function readFailure(res: Response): Promise<ApiFailure> {
  const body = await res.json() as { code?: string };
  return { ok: false, status: res.status, code: body.code ?? '' };
}

export class HttpCycleService implements CycleService {
  async list(filters: CycleListFilters = {}): Promise<ListResult> {
    const params = new URLSearchParams();
    if (filters.name) params.set('name', filters.name);
    if (filters.legislationId !== undefined) params.set('legislationId', String(filters.legislationId));
    if (filters.year !== undefined) params.set('year', String(filters.year));
    const qs = params.toString();
    const res = await fetch(`/api/cycles${qs ? `?${qs}` : ''}`);
    if (!res.ok) return readFailure(res);
    const items = await res.json() as Cycle[];
    return { ok: true, items };
  }

  async create(name: string): Promise<CreateResult> {
    const res = await fetch('/api/cycles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Cycle;
    return { ok: true, item };
  }

  async update(id: number, name: string): Promise<UpdateResult> {
    const res = await fetch(`/api/cycles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Cycle;
    return { ok: true, item };
  }

  async delete(id: number): Promise<DeleteResult> {
    const res = await fetch(`/api/cycles/${id}`, { method: 'DELETE' });
    if (!res.ok) return readFailure(res);
    return { ok: true };
  }
}
