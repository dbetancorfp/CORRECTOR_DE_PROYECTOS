export interface TeacherModule {
  id: number;
  name: string;
}

export interface Teacher {
  id: number;
  username: string;
  role: 'admin' | 'profesor' | 'tutor';
  passwordStatus: 'default' | 'changed';
  accountLocked: boolean;
  failedLoginAttempts: number;
  modules: TeacherModule[];
}

export interface CreateTeacherData {
  username: string;
  password: string;
  moduleId: number;
}

export interface ApiFailure {
  ok: false;
  status: number;
  code: string;
}

export interface ListSuccess {
  ok: true;
  items: Teacher[];
}

export interface ItemSuccess {
  ok: true;
  item: Teacher;
}

export interface DeleteSuccess {
  ok: true;
}

export interface UnlockSuccess {
  ok: true;
  accountLocked: boolean;
  failedLoginAttempts: number;
}

export type ListResult = ListSuccess | ApiFailure;
export type CreateResult = ItemSuccess | ApiFailure;
export type UpdateResult = ItemSuccess | ApiFailure;
export type DeleteResult = DeleteSuccess | ApiFailure;
export type UnlockResult = UnlockSuccess | ApiFailure;

export interface TeacherService {
  list(): Promise<ListResult>;
  create(data: CreateTeacherData): Promise<CreateResult>;
  update(id: number, data: { username?: string }): Promise<UpdateResult>;
  delete(id: number): Promise<DeleteResult>;
  unlock(id: number): Promise<UnlockResult>;
}

async function readFailure(res: Response): Promise<ApiFailure> {
  const body = await res.json() as { code?: string };
  return { ok: false, status: res.status, code: body.code ?? '' };
}

export class HttpTeacherService implements TeacherService {
  async list(): Promise<ListResult> {
    const res = await fetch('/api/teachers');
    if (!res.ok) return readFailure(res);
    const items = await res.json() as Teacher[];
    return { ok: true, items };
  }

  async create(data: CreateTeacherData): Promise<CreateResult> {
    const res = await fetch('/api/teachers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Teacher;
    return { ok: true, item };
  }

  async update(id: number, data: { username?: string }): Promise<UpdateResult> {
    const res = await fetch(`/api/teachers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Teacher;
    return { ok: true, item };
  }

  async delete(id: number): Promise<DeleteResult> {
    const res = await fetch(`/api/teachers/${id}`, { method: 'DELETE' });
    if (!res.ok) return readFailure(res);
    return { ok: true };
  }

  async unlock(id: number): Promise<UnlockResult> {
    const res = await fetch(`/api/teachers/${id}/unlock`, { method: 'POST' });
    if (!res.ok) return readFailure(res);
    const body = await res.json() as { accountLocked: boolean; failedLoginAttempts: number };
    return { ok: true, accountLocked: body.accountLocked, failedLoginAttempts: body.failedLoginAttempts };
  }
}
