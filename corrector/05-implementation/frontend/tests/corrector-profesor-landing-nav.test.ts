// Nav/logout/action chrome — not tied to a single boceto sketchNumber.
// Gestionar/Corregir/Visualizar notas have no data-element-id in the boceto
// (see ui-spec.json screen-profesor-landing notes) and are disabled here
// because their target screens don't exist yet.

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

  it('renders Gestionar, Corregir and Visualizar notas as disabled placeholders', async () => {
    const el = mount(makeAuthService());
    await flush();

    for (const action of ['navigate-gestionar', 'navigate-corregir', 'navigate-notas']) {
      const button = el.shadowRoot!.querySelector(`[data-action="${action}"]`) as HTMLButtonElement;
      expect(button).not.toBeNull();
      expect(button.disabled).toBe(true);
    }
    el.remove();
  });
});
