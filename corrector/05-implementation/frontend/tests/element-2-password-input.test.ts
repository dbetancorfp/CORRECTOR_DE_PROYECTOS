// sketchNumber: 2

import { describe, it, expect } from 'bun:test';
import type { AuthService } from '../src/services/auth.service';
import '../src/components/corrector-login-form';
import type { CorrectorLoginForm } from '../src/components/corrector-login-form';

function makeAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    login: async () => ({ ok: true, role: 'admin', mustChangePassword: false }),
    changePassword: async () => ({ ok: true }),
    logout: async () => ({ ok: true }),
    me: async () => ({ ok: true, id: 1, role: 'admin' }),
    ...overrides,
  };
}

function mount(authService: AuthService): CorrectorLoginForm {
  const el = document.createElement('corrector-login-form') as CorrectorLoginForm;
  el.authService = authService;
  document.body.appendChild(el);
  return el;
}

describe('Element #2 — corrector-login-form: password field', () => {
  it('always renders the password field as type="password" so characters are masked', () => {
    const el = mount(makeAuthService());
    const password = el.shadowRoot!.querySelector('[data-element-id="2"]') as HTMLInputElement;
    expect(password.type).toBe('password');
    password.value = 'anything';
    expect(password.type).toBe('password');
    el.remove();
  });

  it('shows an error state when the form is submitted with an empty password', async () => {
    const el = mount(makeAuthService());
    const username = el.shadowRoot!.querySelector('[data-element-id="1"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="3"]') as HTMLButtonElement;
    username.value = 'admin';
    username.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
    await Promise.resolve();

    const password = el.shadowRoot!.querySelector('[data-element-id="2"]') as HTMLInputElement;
    expect(password.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });

  it('triggers login submission when Enter is pressed in the password field', async () => {
    let loginCalled = false;
    const el = mount(makeAuthService({
      login: async () => { loginCalled = true; return { ok: true, role: 'admin', mustChangePassword: false }; },
    }));
    const username = el.shadowRoot!.querySelector('[data-element-id="1"]') as HTMLInputElement;
    const password = el.shadowRoot!.querySelector('[data-element-id="2"]') as HTMLInputElement;
    username.value = 'admin';
    username.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'Admin1234!';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    password.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(loginCalled).toBe(true);
    el.remove();
  });
});
