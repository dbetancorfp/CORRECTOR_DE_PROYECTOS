import type { Request, Response, NextFunction } from 'express';
import type { TeacherRepository } from '../repositories/teacher.repository';
import type { SessionRepository } from '../repositories/session.repository';

export interface AuthUser {
  id: number;
  username: string;
  role: 'admin' | 'profesor' | 'tutor';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function resolveUser(teacherRepo: TeacherRepository, sessionRepo: SessionRepository) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const sessionId = req.cookies?.session_id as string | undefined;

    if (!sessionId) {
      req.user = undefined;
      return next();
    }

    const session = await sessionRepo.find(sessionId);
    if (!session || session.expiresAt < new Date()) {
      req.user = undefined;
      return next();
    }

    const teacher = await teacherRepo.findById(session.teacherId);
    if (!teacher) {
      req.user = undefined;
      return next();
    }

    req.user = { id: teacher.id, username: teacher.username, role: teacher.role as AuthUser['role'] };
    next();
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden: admin role required' });
    return;
  }
  next();
}

export function requireTutor(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'tutor') {
    res.status(403).json({ error: 'Forbidden: tutor role required' });
    return;
  }
  next();
}
