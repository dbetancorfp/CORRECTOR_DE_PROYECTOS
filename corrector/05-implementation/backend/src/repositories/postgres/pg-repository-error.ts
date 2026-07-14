// Shared across every Pg*Repository — routes/error.ts maps status codes by
// duck-typing `err.code` (see mapError()), not `instanceof`, so a single
// shared class here is a drop-in replacement for the 8 identical local
// declarations it used to have, one per repository file.
export class PgRepositoryError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

// UPDATE/DELETE ... RETURNING id affecting 0 rows is how every Pg*Repository
// detects "not found" — the same 3-4 line if-throw was repeated after
// nearly every update()/delete() across all 8 repositories.
export function assertFound<T>(row: T | undefined, notFoundMessage: string): T {
  if (!row) {
    throw new PgRepositoryError(notFoundMessage, 'NOT_FOUND');
  }
  return row;
}

export function assertRowsAffected(rowCount: number, notFoundMessage: string): void {
  if (rowCount === 0) {
    throw new PgRepositoryError(notFoundMessage, 'NOT_FOUND');
  }
}
