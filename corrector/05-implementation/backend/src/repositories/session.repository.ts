export interface Session {
  teacherId: number;
  expiresAt: Date;
}

export interface SessionRepository {
  create(teacherId: number): Promise<string>;
  destroy(token: string): Promise<void>;
  find(token: string): Promise<Session | null>;
}
