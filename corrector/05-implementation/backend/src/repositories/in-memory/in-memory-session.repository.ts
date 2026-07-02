import type { SessionRepository, Session } from '../session.repository';
import type { Store } from './store';

export class InMemorySessionRepository implements SessionRepository {
  constructor(private readonly store: Store) {}

  async create(teacherId: number): Promise<string> {
    const token = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    this.store.sessions.set(token, { teacherId, expiresAt });
    return token;
  }

  async destroy(token: string): Promise<void> {
    this.store.sessions.delete(token);
  }

  async find(token: string): Promise<Session | null> {
    const s = this.store.sessions.get(token);
    if (!s) return null;
    if (s.expiresAt < new Date()) {
      this.store.sessions.delete(token);
      return null;
    }
    return { teacherId: s.teacherId, expiresAt: s.expiresAt };
  }
}
