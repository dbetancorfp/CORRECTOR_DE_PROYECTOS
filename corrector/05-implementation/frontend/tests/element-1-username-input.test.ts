// sketchNumber: 1

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

describe('Element #1 — corrector-login-form: username field', () => {
  it('shows an error state when the form is submitted with an empty username', async () => {
    const el = mount(makeAuthService());
    const password = el.shadowRoot!.querySelector('[data-element-id="2"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="3"]') as HTMLButtonElement;
    password.value = 'Admin1234!';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
    await Promise.resolve();

    const username = el.shadowRoot!.querySelector('[data-element-id="1"]') as HTMLInputElement;
    expect(username.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });

  it('submits the login when Enter is pressed with a valid username', async () => {
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
    username.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await Promise.resolve();
    await Promise.resolve();

    expect(loginCalled).toBe(true);
    el.remove();
  });

  it('shows the error state on this field after an authentication failure', async () => {
    const el = mount(makeAuthService({
      login: async () => ({ ok: false, status: 401, code: 'INVALID_CREDENTIALS' }),
    }));
    const username = el.shadowRoot!.querySelector('[data-element-id="1"]') as HTMLInputElement;
    const password = el.shadowRoot!.querySelector('[data-element-id="2"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="3"]') as HTMLButtonElement;
    username.value = 'nadie';
    username.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'wrongpass';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(username.getAttribute('aria-invalid')).toBe('true');
    el.remove();
  });
});
