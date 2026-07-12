import './components/corrector-login-form';
import './components/corrector-legislation-form';
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

function renderAdminLegislacion(outlet: HTMLElement): void {
  void (async () => {
    const result = await authService.me();
    if (!result.ok || result.role !== 'admin') {
      router.navigate('/');
      return;
    }
    mount(outlet, 'corrector-legislation-form');
  })();
}

function renderNotImplemented(outlet: HTMLElement): void {
  outlet.replaceChildren(document.createTextNode('Pantalla en construcción'));
}

const routes: Route[] = [
  { path: '/', render: renderLogin },
  { path: '/admin', render: renderAdminLegislacion },
  { path: '/admin/legislacion', render: renderAdminLegislacion },
];

const outlet = document.getElementById('app');
if (!outlet) throw new Error('Missing #app outlet in index.html');

const router = new Router(routes, outlet, { path: '*', render: renderNotImplemented });
router.start();

document.addEventListener('corrector:login-succeeded', (e) => {
  const { redirectTo } = (e as CustomEvent<{ redirectTo: string }>).detail;
  router.navigate(redirectTo);
});

document.addEventListener('corrector:logout', () => {
  void (async () => {
    await authService.logout();
    router.navigate('/');
  })();
});
