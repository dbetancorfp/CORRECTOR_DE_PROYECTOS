export interface AssignedStudent {
  studentId: number;
  name: string;
}

export interface AssignSuccess {
  ok: true;
  projectId: number;
  assigned: number[];
  totalStudents: number;
}

export interface ApiFailure {
  ok: false;
  status: number;
  code: string;
}

export interface ListSuccess {
  ok: true;
  items: AssignedStudent[];
}

export interface UnassignSuccess {
  ok: true;
}

export type ListResult = ListSuccess | ApiFailure;
export type AssignResult = AssignSuccess | ApiFailure;
export type UnassignResult = UnassignSuccess | ApiFailure;

export interface ProjectStudentService {
  listForProject(projectId: number): Promise<ListResult>;
  assign(projectId: number, studentIds: number[]): Promise<AssignResult>;
  unassign(projectId: number, studentId: number): Promise<UnassignResult>;
}

async function readFailure(res: Response): Promise<ApiFailure> {
  const body = await res.json() as { code?: string };
  return { ok: false, status: res.status, code: body.code ?? '' };
}

export class HttpProjectStudentService implements ProjectStudentService {
  async listForProject(projectId: number): Promise<ListResult> {
    const res = await fetch(`/api/projects/${projectId}/students`);
    if (!res.ok) return readFailure(res);
    const items = await res.json() as AssignedStudent[];
    return { ok: true, items };
  }

  async assign(projectId: number, studentIds: number[]): Promise<AssignResult> {
    const res = await fetch(`/api/projects/${projectId}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentIds }),
    });
    if (!res.ok) return readFailure(res);
    const body = await res.json() as { projectId: number; assigned: number[]; totalStudents: number };
    return { ok: true, ...body };
  }

  async unassign(projectId: number, studentId: number): Promise<UnassignResult> {
    const res = await fetch(`/api/projects/${projectId}/students/${studentId}`, { method: 'DELETE' });
    if (!res.ok) return readFailure(res);
    return { ok: true };
  }
}
