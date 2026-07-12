export interface RubricLevel {
  id: number;
  name: string;
  score: number;
  displayOrder: number;
}

export interface RubricItem {
  id: number;
  description: string;
  displayOrder: number;
  levels: RubricLevel[];
}

export interface Rubric {
  id: number;
  moduleId: number;
  academicYear: string;
  frozen: boolean;
  items: RubricItem[];
}

export interface LevelInput {
  name: string;
  score: number;
  displayOrder: number;
}

export interface AddItemData {
  academicYear: string;
  description: string;
  displayOrder: number;
  levels: LevelInput[];
}

export interface UpdateItemData {
  description?: string;
  displayOrder?: number;
  levels?: LevelInput[];
}

export interface ApiFailure {
  ok: false;
  status: number;
  code: string;
}

export interface GetSuccess {
  ok: true;
  item: Rubric;
}

export interface ItemSuccess {
  ok: true;
  item: RubricItem;
}

export interface DeleteSuccess {
  ok: true;
}

export interface UploadSuccess {
  ok: true;
}

export type GetResult = GetSuccess | ApiFailure;
export type AddItemResult = ItemSuccess | ApiFailure;
export type UpdateItemResult = ItemSuccess | ApiFailure;
export type DeleteItemResult = DeleteSuccess | ApiFailure;
export type UploadResult = UploadSuccess | ApiFailure;

export interface RubricService {
  getForModule(moduleId: number, academicYear: string): Promise<GetResult>;
  addItem(moduleId: number, data: AddItemData): Promise<AddItemResult>;
  updateItem(itemId: number, data: UpdateItemData): Promise<UpdateItemResult>;
  deleteItem(itemId: number): Promise<DeleteItemResult>;
  upload(moduleId: number, academicYear: string, file: File, confirm: boolean): Promise<UploadResult>;
}

async function readFailure(res: Response): Promise<ApiFailure> {
  const body = await res.json() as { code?: string };
  return { ok: false, status: res.status, code: body.code ?? '' };
}

export class HttpRubricService implements RubricService {
  async getForModule(moduleId: number, academicYear: string): Promise<GetResult> {
    const res = await fetch(`/api/modules/${moduleId}/rubric?academicYear=${encodeURIComponent(academicYear)}`);
    if (!res.ok) return readFailure(res);
    const item = await res.json() as Rubric;
    return { ok: true, item };
  }

  async addItem(moduleId: number, data: AddItemData): Promise<AddItemResult> {
    const res = await fetch(`/api/modules/${moduleId}/rubric/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as RubricItem;
    return { ok: true, item };
  }

  async updateItem(itemId: number, data: UpdateItemData): Promise<UpdateItemResult> {
    const res = await fetch(`/api/rubric/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as RubricItem;
    return { ok: true, item };
  }

  async deleteItem(itemId: number): Promise<DeleteItemResult> {
    const res = await fetch(`/api/rubric/items/${itemId}`, { method: 'DELETE' });
    if (!res.ok) return readFailure(res);
    return { ok: true };
  }

  async upload(moduleId: number, academicYear: string, file: File, confirm: boolean): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('academicYear', academicYear);
    formData.append('confirm', String(confirm));
    const res = await fetch(`/api/modules/${moduleId}/rubric/upload`, { method: 'POST', body: formData });
    if (!res.ok) return readFailure(res);
    return { ok: true };
  }
}
