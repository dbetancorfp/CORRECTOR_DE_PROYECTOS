export interface Module {
  id: number;
  name: string;
  weeklyHours: number;
  cycleId: number;
  cycleName: string;
  legislationId: number;
  legislationName: string;
}

export interface CreateModuleData {
  name: string;
  weeklyHours: number;
  cycleId: number;
  legislationId: number;
}

export interface ApiFailure {
  ok: false;
  status: number;
  code: string;
}

export interface ListSuccess {
  ok: true;
  items: Module[];
}

export interface ItemSuccess {
  ok: true;
  item: Module;
}

export interface DeleteSuccess {
  ok: true;
}

export type ListResult = ListSuccess | ApiFailure;
export type CreateResult = ItemSuccess | ApiFailure;
export type UpdateResult = ItemSuccess | ApiFailure;
export type DeleteResult = DeleteSuccess | ApiFailure;

export interface ModuleService {
  list(): Promise<ListResult>;
  create(data: CreateModuleData): Promise<CreateResult>;
  update(id: number, data: Partial<CreateModuleData>): Promise<UpdateResult>;
  delete(id: number): Promise<DeleteResult>;
}

async function readFailure(res: Response): Promise<ApiFailure> {
  const body = await res.json() as { code?: string };
  return { ok: false, status: res.status, code: body.code ?? '' };
}

export class HttpModuleService implements ModuleService {
  async list(): Promise<ListResult> {
    const res = await fetch('/api/modules');
    if (!res.ok) return readFailure(res);
    const items = await res.json() as Module[];
    return { ok: true, items };
  }

  async create(data: CreateModuleData): Promise<CreateResult> {
    const res = await fetch('/api/modules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Module;
    return { ok: true, item };
  }

  async update(id: number, data: Partial<CreateModuleData>): Promise<UpdateResult> {
    const res = await fetch(`/api/modules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Module;
    return { ok: true, item };
  }

  async delete(id: number): Promise<DeleteResult> {
    const res = await fetch(`/api/modules/${id}`, { method: 'DELETE' });
    if (!res.ok) return readFailure(res);
    return { ok: true };
  }
}
