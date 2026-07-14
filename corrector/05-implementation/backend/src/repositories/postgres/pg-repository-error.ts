// Shared across every Pg*Repository — routes/error.ts maps status codes by
// duck-typing `err.code` (see mapError()), not `instanceof`, so a single
// shared class here is a drop-in replacement for the 8 identical local
// declarations it used to have, one per repository file.
export class PgRepositoryError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}
