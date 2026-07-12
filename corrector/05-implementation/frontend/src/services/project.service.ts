export interface Project {
  id: number;
  name: string;
  academicYear: string;
  moduleId: number;
  moduleName: string;
  cycleName: string;
  studentCount: number;
}

export interface CreateProjectData {
  name: string;
  academicYear: string;
  moduleId: number;
}

export interface ProjectListFilters {
  name?: string;
  academicYear?: string;
  moduleId?: number;
  legislationId?: number;
}

export interface ApiFailure {
  ok: false;
  status: number;
  code: string;
}

export interface ListSuccess {
  ok: true;
  items: Project[];
}

export interface ItemSuccess {
  ok: true;
  item: Project;
}

export interface DeleteSuccess {
  ok: true;
}

export type ListResult = ListSuccess | ApiFailure;
export type CreateResult = ItemSuccess | ApiFailure;
export type UpdateResult = ItemSuccess | ApiFailure;
export type DeleteResult = DeleteSuccess | ApiFailure;

export interface ProjectService {
  list(filters?: ProjectListFilters): Promise<ListResult>;
  create(data: CreateProjectData): Promise<CreateResult>;
  update(id: number, data: Partial<CreateProjectData>): Promise<UpdateResult>;
  delete(id: number): Promise<DeleteResult>;
}

async function readFailure(res: Response): Promise<ApiFailure> {
  const body = await res.json() as { code?: string };
  return { ok: false, status: res.status, code: body.code ?? '' };
}

export class HttpProjectService implements ProjectService {
  async list(filters: ProjectListFilters = {}): Promise<ListResult> {
    const params = new URLSearchParams();
    if (filters.name) params.set('name', filters.name);
    if (filters.academicYear) params.set('academicYear', filters.academicYear);
    if (filters.moduleId !== undefined) params.set('moduleId', String(filters.moduleId));
    if (filters.legislationId !== undefined) params.set('legislationId', String(filters.legislationId));
    const qs = params.toString();
    const res = await fetch(`/api/projects${qs ? `?${qs}` : ''}`);
    if (!res.ok) return readFailure(res);
    const items = await res.json() as Project[];
    return { ok: true, items };
  }

  async create(data: CreateProjectData): Promise<CreateResult> {
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Project;
    return { ok: true, item };
  }

  async update(id: number, data: Partial<CreateProjectData>): Promise<UpdateResult> {
    const res = await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Project;
    return { ok: true, item };
  }

  async delete(id: number): Promise<DeleteResult> {
    const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
    if (!res.ok) return readFailure(res);
    return { ok: true };
  }
}
