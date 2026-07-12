// sketchNumber: 47

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

describe('Element #47 — corrector-profesor-landing: Imprimir notas button', () => {
  it('is not rendered for role=profesor', async () => {
    const el = mount(makeAuthService({ me: async () => ({ ok: true, role: 'profesor' }) }));
    await flush();

    const button = el.shadowRoot!.querySelector('[data-element-id="47"]');
    expect(button).toBeNull();
    el.remove();
  });

  it('is rendered and clickable for role=tutor', async () => {
    const el = mount(makeAuthService({ me: async () => ({ ok: true, role: 'tutor' }) }));
    await flush();

    const button = el.shadowRoot!.querySelector('[data-element-id="47"]') as HTMLButtonElement;
    expect(button).not.toBeNull();
    expect(button.disabled).toBe(false);
    expect(button.textContent).toContain('Imprimir notas');
    el.remove();
  });

  it('navigates to the panoramic grade print view when clicked by a tutor', async () => {
    const el = mount(makeAuthService({ me: async () => ({ ok: true, role: 'tutor' }) }));
    await flush();

    let navigatedTo: string | null = null;
    el.addEventListener('corrector:profesor-landing-navigate', (e) => {
      navigatedTo = (e as CustomEvent<{ to: string }>).detail.to;
    });

    const button = el.shadowRoot!.querySelector('[data-element-id="47"]') as HTMLButtonElement;
    button.click();

    expect(navigatedTo).toBe('/profesor/notas');
    el.remove();
  });
});
