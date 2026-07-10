import type { SessionRepository, Session } from '../session.repository';

// Sessions are ephemeral process state, not domain data — there is no `session`
// table in schema.sql, so this Map-backed repository is reused as-is in both
// memory and postgres backends (decoupled from Store; no PgSessionRepository).
export type SessionMap = Map<string, { teacherId: number; expiresAt: Date }>;

export class InMemorySessionRepository implements SessionRepository {
  constructor(private readonly sessions: SessionMap) {}

  async create(teacherId: number): Promise<string> {
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    this.sessions.set(token, { teacherId, expiresAt });
    return token;
  }

  async destroy(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async find(token: string): Promise<Session | null> {
    const s = this.sessions.get(token);
    if (!s) return null;
    if (s.expiresAt < new Date()) {
      this.sessions.delete(token);
      return null;
    }
    return { teacherId: s.teacherId, expiresAt: s.expiresAt };
  }
}
