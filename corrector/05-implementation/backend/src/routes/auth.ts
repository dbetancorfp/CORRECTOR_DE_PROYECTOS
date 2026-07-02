import { Router } from 'express';
import type { TeacherRepository } from '../repositories/teacher.repository';
import type { SessionRepository } from '../repositories/session.repository';
import { AuthService } from '../services/auth.service';
import { mapError } from './error';

export function createAuthRouter(
  teacherRepo: TeacherRepository,
  sessionRepo: SessionRepository,
): Router {
  const router = Router();
  const service = new AuthService(teacherRepo, sessionRepo);

  router.post('/login', async (req, res) => {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || username.length === 0) {
      res.status(400).json({ error: 'Username is required' });
      return;
    }
    if (!password || password.length === 0) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }
    try {
      const result = await service.login(username, password);
      res
        .cookie('session_id', result.sessionToken, { httpOnly: true, sameSite: 'strict' })
        .json({ role: result.role, mustChangePassword: result.mustChangePassword });
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  router.post('/logout', async (req, res) => {
    const sessionId = req.cookies?.session_id as string | undefined;
    if (sessionId) {
      await service.logout(sessionId);
    }
    res
      .cookie('session_id', '', { maxAge: 0, httpOnly: true })
      .json({ ok: true });
  });

  router.get('/me', async (req, res) => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const teacher = await teacherRepo.findById(req.user.id);
    res.json({
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      mustChangePassword: teacher?.mustChangePassword ?? false,
    });
  });

  router.post('/change-password', async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body as {
      currentPassword?: string;
      newPassword?: string;
      confirmPassword?: string;
    };
    if (!newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      res.status(400).json({ error: 'Passwords do not match' });
      return;
    }
    const teacherId = req.user?.id ?? 0;
    try {
      await service.changePassword(teacherId, currentPassword ?? '', newPassword, confirmPassword ?? '');
      res.json({ ok: true });
    } catch (err) {
      const { status, body } = mapError(err);
      res.status(status).json(body);
    }
  });

  return router;
}
