import './components/corrector-login-form';
import './components/corrector-legislation-form';
import './components/corrector-cycles-form';
import './components/corrector-modules-form';
import './components/corrector-teachers-form';
import { Router } from './router';
import type { Route } from './router';
import { HttpAuthService } from './services/auth.service';

const authService = new HttpAuthService();

function mount(outlet: HTMLElement, tagName: string): void {
  outlet.replaceChildren(document.createElement(tagName));
}

function renderLogin(outlet: HTMLElement): void {
  mount(outlet, 'corrector-login-form');
}

function renderAdminScreen(tagName: string): (outlet: HTMLElement) => void {
  return (outlet) => {
    void (async () => {
      const result = await authService.me();
      if (!result.ok || result.role !== 'admin') {
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
  { path: '/admin/legislacion', render: renderAdminScreen('corrector-legislation-form') },
  { path: '/admin/ciclos', render: renderAdminScreen('corrector-cycles-form') },
  { path: '/admin/modulos', render: renderAdminScreen('corrector-modules-form') },
  { path: '/admin/profesorado', render: renderAdminScreen('corrector-teachers-form') },
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

document.addEventListener('corrector:logout', () => {
  void (async () => {
    await authService.logout();
    router.navigate('/');
  })();
});
