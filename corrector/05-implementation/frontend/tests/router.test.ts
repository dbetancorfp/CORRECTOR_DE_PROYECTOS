// Infrastructure test — router.ts is shared navigation plumbing, not tied to a
// single boceto sketchNumber (same category as dom-setup.ts).

import { describe, it, expect, beforeEach } from 'bun:test';
import { Router } from '../src/router';
import type { Route } from '../src/router';

function makeOutlet(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

beforeEach(() => {
  window.history.pushState({}, '', '/');
});

describe('Router — infrastructure', () => {
  it('renders the route matching the current path on start()', () => {
    window.history.pushState({}, '', '/admin/legislacion');
    let rendered = '';
    const routes: Route[] = [
      { path: '/', render: () => { rendered = 'login'; } },
      { path: '/admin/legislacion', render: () => { rendered = 'legislacion'; } },
    ];
    const fallback: Route = { path: '*', render: () => { rendered = 'fallback'; } };
    const router = new Router(routes, makeOutlet(), fallback);

    router.start();

    expect(rendered).toBe('legislacion');
  });

  it('navigate() pushes history state and renders the matching route', () => {
    let rendered = '';
    const routes: Route[] = [
      { path: '/', render: () => { rendered = 'login'; } },
      { path: '/admin/legislacion', render: () => { rendered = 'legislacion'; } },
    ];
    const fallback: Route = { path: '*', render: () => { rendered = 'fallback'; } };
    const router = new Router(routes, makeOutlet(), fallback);
    router.start();

    router.navigate('/admin/legislacion');

    expect(rendered).toBe('legislacion');
    expect(window.location.pathname).toBe('/admin/legislacion');
  });

  it('falls back for a path with no registered route', () => {
    let rendered = '';
    const routes: Route[] = [
      { path: '/', render: () => { rendered = 'login'; } },
    ];
    const fallback: Route = { path: '*', render: () => { rendered = 'fallback'; } };
    const router = new Router(routes, makeOutlet(), fallback);
    router.start();

    router.navigate('/profesor');

    expect(rendered).toBe('fallback');
    expect(window.location.pathname).toBe('/profesor');
  });

  it('re-resolves the current route when the browser back/forward buttons fire popstate', () => {
    let rendered = '';
    const routes: Route[] = [
      { path: '/', render: () => { rendered = 'login'; } },
      { path: '/admin/legislacion', render: () => { rendered = 'legislacion'; } },
    ];
    const fallback: Route = { path: '*', render: () => { rendered = 'fallback'; } };
    const router = new Router(routes, makeOutlet(), fallback);
    router.start();
    router.navigate('/admin/legislacion');
    expect(rendered).toBe('legislacion');

    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(rendered).toBe('login');
  });
});
