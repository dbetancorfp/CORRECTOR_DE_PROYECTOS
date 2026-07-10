import type { SqlExecutor, TransactionalSqlExecutor } from '../../src/db/sql-executor';

export interface FakeSqlCall {
  text: string;
  values: unknown[];
}

export interface FakeSql extends TransactionalSqlExecutor {
  calls: FakeSqlCall[];
}

/**
 * Fake tagged-template SQL executor for unit-testing Pg*Repository classes.
 * Queues canned responses returned in call order (an Error rejects instead,
 * simulating a Postgres trigger/constraint failure); records the raw query
 * text (joined on `?`) and interpolated values for assertions. Does not
 * validate SQL syntax — real correctness is verified against Postgres
 * separately.
 *
 * `.begin(fn)` runs `fn` against this same fake (no real transaction
 * semantics) so queries issued inside the callback consume the same queued
 * responses and are recorded in the same `calls` log.
 */
export function makeFakeSql(responses: unknown[]): FakeSql {
  const calls: FakeSqlCall[] = [];
  let cursor = 0;

  const fn = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ text: strings.join('?'), values });
    if (cursor >= responses.length) {
      throw new Error(`FakeSql: no queued response for call #${cursor + 1} (query: ${strings.join('?')})`);
    }
    const next = responses[cursor++];
    if (next instanceof Error) {
      return Promise.reject(next);
    }
    return Promise.resolve(next);
  }) as FakeSql;

  fn.calls = calls;
  fn.begin = async <T>(txFn: (tx: SqlExecutor) => Promise<T>): Promise<T> => txFn(fn);
  return fn;
}
