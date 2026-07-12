// Nav/logout/action chrome — not tied to a single boceto sketchNumber.
// Gestionar/Corregir/Visualizar notas have no data-element-id in the boceto
// (see ui-spec.json screen-profesor-landing notes). Gestionar is enabled now
// that /profesor/gestionar/alumnos exists; Corregir/Visualizar notas stay
// disabled because their target screens still don't exist.

import { describe, it, expect } from 'bun:test';
import type { AuthService } from '../src/services/auth.service';
import '../src/components/corrector-profesor-landing';
import type { CorrectorProfesorLanding } from '../src/components/corrector-profesor-landing';

function makeAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    login: async () => ({ ok: true, role: 'profesor', mustChangePassword: false }),
    changePassword: async () => ({ ok: true }),
    logout: async () => ({ ok: true }),
    me: async () => ({ ok: true, role: 'profesor' }),
    ...overrides,
  };
}

function mount(authService: AuthService): CorrectorProfesorLanding {
  const el = document.createElement('corrector-profesor-landing') as CorrectorProfesorLanding;
  el.authService = authService;
  document.body.appendChild(el);
  return el;
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('corrector-profesor-landing: nav chrome', () => {
  it('dispatches corrector:logout when Salir is clicked', async () => {
    const el = mount(makeAuthService());
    await flush();

    let logoutFired = false;
    document.addEventListener('corrector:logout', () => { logoutFired = true; }, { once: true });

    const button = el.shadowRoot!.querySelector('[data-action="logout"]') as HTMLButtonElement;
    button.click();

    expect(logoutFired).toBe(true);
    el.remove();
  });

  it('renders Corregir and Visualizar notas as disabled placeholders', async () => {
    const el = mount(makeAuthService());
    await flush();

    for (const action of ['navigate-corregir', 'navigate-notas']) {
      const button = el.shadowRoot!.querySelector(`[data-action="${action}"]`) as HTMLButtonElement;
      expect(button).not.toBeNull();
      expect(button.disabled).toBe(true);
    }
    el.remove();
  });

  it('navigates to /profesor/gestionar/alumnos when Gestionar is clicked', async () => {
    const el = mount(makeAuthService());
    await flush();

    let navigatedTo: string | null = null;
    el.addEventListener('corrector:profesor-landing-navigate', (e) => {
      navigatedTo = (e as CustomEvent<{ to: string }>).detail.to;
    });

    const button = el.shadowRoot!.querySelector('[data-action="navigate-gestionar"]') as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();

    expect(navigatedTo).toBe('/profesor/gestionar/alumnos');
    el.remove();
  });
});
