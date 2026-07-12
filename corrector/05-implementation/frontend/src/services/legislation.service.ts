export interface Legislation {
  id: number;
  name: string;
  startYear: number;
}

export interface ApiFailure {
  ok: false;
  status: number;
  code: string;
}

export interface ListSuccess {
  ok: true;
  items: Legislation[];
}

export interface ItemSuccess {
  ok: true;
  item: Legislation;
}

export interface DeleteSuccess {
  ok: true;
}

export type ListResult = ListSuccess | ApiFailure;
export type CreateResult = ItemSuccess | ApiFailure;
export type UpdateResult = ItemSuccess | ApiFailure;
export type DeleteResult = DeleteSuccess | ApiFailure;

export interface LegislationService {
  list(): Promise<ListResult>;
  create(name: string, startYear: number): Promise<CreateResult>;
  update(id: number, data: { name?: string; startYear?: number }): Promise<UpdateResult>;
  delete(id: number): Promise<DeleteResult>;
}

async function readFailure(res: Response): Promise<ApiFailure> {
  const body = await res.json() as { code?: string };
  return { ok: false, status: res.status, code: body.code ?? '' };
}

export class HttpLegislationService implements LegislationService {
  async list(): Promise<ListResult> {
    const res = await fetch('/api/legislation');
    if (!res.ok) return readFailure(res);
    const items = await res.json() as Legislation[];
    return { ok: true, items };
  }

  async create(name: string, startYear: number): Promise<CreateResult> {
    const res = await fetch('/api/legislation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, startYear }),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Legislation;
    return { ok: true, item };
  }

  async update(id: number, data: { name?: string; startYear?: number }): Promise<UpdateResult> {
    const res = await fetch(`/api/legislation/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Legislation;
    return { ok: true, item };
  }

  async delete(id: number): Promise<DeleteResult> {
    const res = await fetch(`/api/legislation/${id}`, { method: 'DELETE' });
    if (!res.ok) return readFailure(res);
    return { ok: true };
  }
}
