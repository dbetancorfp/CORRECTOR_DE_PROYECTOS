import './components/corrector-login-form';
import './components/corrector-legislation-form';
import './components/corrector-cycles-form';
import './components/corrector-modules-form';
import './components/corrector-teachers-form';
import './components/corrector-profesor-landing';
import './components/corrector-students-form';
import './components/corrector-projects-form';
import './components/corrector-assignment-form';
import './components/corrector-rubric-form';
import './components/corrector-correction-form';
import { Router } from './router';
import type { Route } from './router';
import { HttpAuthService } from './services/auth.service';
import type { TeacherRole } from './services/auth.service';

const authService = new HttpAuthService();

function mount(outlet: HTMLElement, tagName: string): void {
  outlet.replaceChildren(document.createElement(tagName));
}

function renderLogin(outlet: HTMLElement): void {
  mount(outlet, 'corrector-login-form');
}

function renderGuardedScreen(tagName: string, allowedRoles: TeacherRole[]): (outlet: HTMLElement) => void {
  return (outlet) => {
    void (async () => {
      const result = await authService.me();
      if (!result.ok || !allowedRoles.includes(result.role)) {
        router.navigate('/');
        return;
      }
      mount(outlet, tagName);
    })();
  };
}

function renderNotImplemented(outlet: HTMLElement): void {
  outlet.replaceChildren(document.createTextNode('Pantalla en construcción'));
}

function renderAdminRoot(outlet: HTMLElement): void {
  router.navigate('/admin/legislacion');
}

const routes: Route[] = [
  { path: '/', render: renderLogin },
  // Canonicalizes to /admin/legislacion rather than mounting it directly at
  // /admin — the tab bar (admin-nav.ts) always reflects the real URL, so
  // landing on the bare /admin path would show the Legislación tab as active
  // while the address bar disagreed.
  { path: '/admin', render: renderAdminRoot },
  { path: '/admin/legislacion', render: renderGuardedScreen('corrector-legislation-form', ['admin']) },
  { path: '/admin/ciclos', render: renderGuardedScreen('corrector-cycles-form', ['admin']) },
  { path: '/admin/modulos', render: renderGuardedScreen('corrector-modules-form', ['admin']) },
  { path: '/admin/profesorado', render: renderGuardedScreen('corrector-teachers-form', ['admin']) },
  { path: '/profesor', render: renderGuardedScreen('corrector-profesor-landing', ['profesor', 'tutor']) },
  { path: '/profesor/gestionar/alumnos', render: renderGuardedScreen('corrector-students-form', ['profesor', 'tutor']) },
  { path: '/profesor/gestionar/proyectos', render: renderGuardedScreen('corrector-projects-form', ['profesor', 'tutor']) },
  { path: '/profesor/gestionar/asignacion', render: renderGuardedScreen('corrector-assignment-form', ['profesor', 'tutor']) },
  { path: '/profesor/gestionar/rubrica', render: renderGuardedScreen('corrector-rubric-form', ['profesor', 'tutor']) },
  { path: '/profesor/corregir', render: renderGuardedScreen('corrector-correction-form', ['profesor', 'tutor']) },
];

const outlet = document.getElementById('app');
if (!outlet) throw new Error('Missing #app outlet in index.html');

const router = new Router(routes, outlet, { path: '*', render: renderNotImplemented });
router.start();

document.addEventListener('corrector:login-succeeded', (e) => {
  const { redirectTo } = (e as CustomEvent<{ redirectTo: string }>).detail;
  router.navigate(redirectTo);
});

document.addEventListener('corrector:admin-nav-selected', (e) => {
  const { to } = (e as CustomEvent<{ to: string }>).detail;
  router.navigate(to);
});

document.addEventListener('corrector:profesor-landing-navigate', (e) => {
  const { to } = (e as CustomEvent<{ to: string }>).detail;
  router.navigate(to);
});

document.addEventListener('corrector:gestion-nav-selected', (e) => {
  const { to } = (e as CustomEvent<{ to: string }>).detail;
  router.navigate(to);
});

document.addEventListener('corrector:logout', () => {
  void (async () => {
    await authService.logout();
    router.navigate('/');
  })();
});
