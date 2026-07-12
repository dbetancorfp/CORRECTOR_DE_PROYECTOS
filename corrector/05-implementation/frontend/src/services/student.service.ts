export interface StudentModule {
  id: number;
  name: string;
}

export interface Student {
  id: number;
  name: string;
  cycleId: number;
  cycleName: string;
  modules: StudentModule[];
}

export interface CreateStudentData {
  name: string;
  cycleId: number;
  moduleId: number;
}

export interface StudentListFilters {
  name?: string;
  cycleId?: number;
  moduleId?: number;
}

export interface ApiFailure {
  ok: false;
  status: number;
  code: string;
}

export interface ListSuccess {
  ok: true;
  items: Student[];
}

export interface ItemSuccess {
  ok: true;
  item: Student;
}

export interface DeleteSuccess {
  ok: true;
}

export interface UploadSuccess {
  ok: true;
  created: number;
}

export interface UploadFailure {
  ok: false;
  status: number;
  message: string;
}

export type ListResult = ListSuccess | ApiFailure;
export type CreateResult = ItemSuccess | ApiFailure;
export type UpdateResult = ItemSuccess | ApiFailure;
export type DeleteResult = DeleteSuccess | ApiFailure;
export type UploadResult = UploadSuccess | UploadFailure;

export interface StudentService {
  list(filters?: StudentListFilters): Promise<ListResult>;
  create(data: CreateStudentData): Promise<CreateResult>;
  update(id: number, data: Partial<CreateStudentData>): Promise<UpdateResult>;
  delete(id: number): Promise<DeleteResult>;
  upload(file: File): Promise<UploadResult>;
}

async function readFailure(res: Response): Promise<ApiFailure> {
  const body = await res.json() as { code?: string };
  return { ok: false, status: res.status, code: body.code ?? '' };
}

export class HttpStudentService implements StudentService {
  async list(filters: StudentListFilters = {}): Promise<ListResult> {
    const params = new URLSearchParams();
    if (filters.name) params.set('name', filters.name);
    if (filters.cycleId !== undefined) params.set('cycleId', String(filters.cycleId));
    if (filters.moduleId !== undefined) params.set('moduleId', String(filters.moduleId));
    const qs = params.toString();
    const res = await fetch(`/api/students${qs ? `?${qs}` : ''}`);
    if (!res.ok) return readFailure(res);
    const items = await res.json() as Student[];
    return { ok: true, items };
  }

  async create(data: CreateStudentData): Promise<CreateResult> {
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Student;
    return { ok: true, item };
  }

  async update(id: number, data: Partial<CreateStudentData>): Promise<UpdateResult> {
    const res = await fetch(`/api/students/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Student;
    return { ok: true, item };
  }

  async delete(id: number): Promise<DeleteResult> {
    const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    if (!res.ok) return readFailure(res);
    return { ok: true };
  }

  async upload(file: File): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/students/upload', { method: 'POST', body: formData });
    if (!res.ok) {
      const body = await res.json() as { error?: string; errors?: Array<{ message?: string }> };
      const message = body.error ?? body.errors?.[0]?.message ?? 'Upload failed';
      return { ok: false, status: res.status, message };
    }
    const body = await res.json() as { created: number };
    return { ok: true, created: body.created };
  }
}
