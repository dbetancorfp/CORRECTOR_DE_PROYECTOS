export interface CorrectionItemInput {
  rubricItemId: number;
  rubricLevelId: number;
}

export interface UpsertCorrectionData {
  studentId: number;
  projectId: number;
  moduleId: number;
  rubricId: number;
  academicYear: string;
  items: CorrectionItemInput[];
}

export interface CorrectionResult {
  id: number;
  studentId: number;
  projectId: number;
  moduleId: number;
  rubricId: number;
  academicYear: string;
  finalScore: number;
  items: CorrectionItemInput[];
}

export interface ApiFailure {
  ok: false;
  status: number;
  code: string;
}

export interface FindSuccess {
  ok: true;
  item: CorrectionResult | null;
}

export interface UpsertSuccess {
  ok: true;
  item: CorrectionResult;
}

export type FindResult = FindSuccess | ApiFailure;
export type UpsertResult = UpsertSuccess | ApiFailure;

export interface CorrectionService {
  findExisting(studentId: number, projectId: number): Promise<FindResult>;
  upsert(data: UpsertCorrectionData): Promise<UpsertResult>;
}

async function readFailure(res: Response): Promise<ApiFailure> {
  const body = await res.json() as { code?: string };
  return { ok: false, status: res.status, code: body.code ?? '' };
}

export class HttpCorrectionService implements CorrectionService {
  async findExisting(studentId: number, projectId: number): Promise<FindResult> {
    const res = await fetch(`/api/corrections?studentId=${studentId}&projectId=${projectId}`);
    if (!res.ok) return readFailure(res);
    const item = await res.json() as CorrectionResult | null;
    return { ok: true, item };
  }

  async upsert(data: UpsertCorrectionData): Promise<UpsertResult> {
    const res = await fetch('/api/corrections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return readFailure(res);
    const item = await res.json() as CorrectionResult;
    return { ok: true, item };
  }
}
