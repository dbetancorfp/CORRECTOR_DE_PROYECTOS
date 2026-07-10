// Narrow structural type for what Pg*Repository classes need from Bun.SQL —
// only the tagged-template call signature, so tests can fake it without
// implementing the full Bun.SQL surface (mirrors SchemaSqlClient in schema-bootstrap.ts).
export interface SqlExecutor {
  <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
}

// Extends SqlExecutor with sql.begin() for repositories that need atomic
// multi-statement writes (only PgCorrectionRepository, currently).
export interface TransactionalSqlExecutor extends SqlExecutor {
  begin<T>(fn: (tx: SqlExecutor) => Promise<T>): Promise<T>;
}
