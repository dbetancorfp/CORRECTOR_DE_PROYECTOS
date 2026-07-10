const STATUS_MAP: Record<string, number> = {
  NOT_FOUND: 404,
  DUPLICATE: 409,
  HAS_DEPENDANTS: 409,
  HAS_MODULES: 409,
  HAS_PROJECTS: 409,
  HAS_CORRECTIONS: 409,
  HAS_STUDENTS: 409,
  LIMIT_EXCEEDED: 409,
  YEAR_CONFLICT: 409,
  MODULE_ALREADY_ASSIGNED: 409,
  CONFLICT: 409,
  SCORE_LIMIT_EXCEEDED: 409,
  REQUIRES_CONFIRMATION: 409,
  VALIDATION_ERROR: 400,
  MAL_NONZERO: 400,
  TOO_MANY_LEVELS: 400,
  INCOMPLETE_SELECTION: 400,
  INVALID_LEVEL_ASSIGNMENT: 400,
  NO_RUBRIC: 400,
  UNSUPPORTED_FORMAT: 400,
  INVALID_CREDENTIALS: 401,
  NOT_AUTHENTICATED: 401,
  ACCOUNT_LOCKED: 423,
  RUBRIC_FROZEN: 423,
};

export function mapError(err: unknown): { status: number; body: Record<string, unknown> } {
  if (err instanceof Error) {
    const code = (err as Error & { code?: string }).code ?? '';
    const status = STATUS_MAP[code] ?? 500;
    const role = (err as Error & { role?: string }).role;
    const body: Record<string, unknown> = { error: err.message, code };
    if (role !== undefined) body.role = role;
    return { status, body };
  }
  return { status: 500, body: { error: 'Internal server error' } };
}
