// sketchNumber: 3

import { describe, it, expect } from 'bun:test';
import { LoginController } from '../src/controllers/login-controller';
import type { AuthService, LoginApiResult, ChangePasswordApiResult } from '../src/services/auth.service';
import '../src/components/corrector-login-form';
import type { CorrectorLoginForm } from '../src/components/corrector-login-form';

// ── Domain doubles ────────────────────────────────────────────────────────────

function makeAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    login: async () => ({ ok: true, role: 'admin', mustChangePassword: false }),
    changePassword: async () => ({ ok: true }),
    ...overrides,
  };
}

// ── Element #3 — LoginController: successful login ───────────────────────────

describe('Element #3 — LoginController: successful login', () => {
  it('redirects to /admin for admin role', async () => {
    const controller = new LoginController(makeAuthService({
      login: async () => ({ ok: true, role: 'admin', mustChangePassword: false }),
    }));
    const state = await controller.login('admin', 'Admin1234!');
    expect(state).toEqual({ status: 'redirect', to: '/admin' });
  });

  it('redirects to /profesor for profesor role', async () => {
    const controller = new LoginController(makeAuthService({
      login: async () => ({ ok: true, role: 'profesor', mustChangePassword: false }),
    }));
    const state = await controller.login('profesor1', '12345678');
    expect(state).toEqual({ status: 'redirect', to: '/profesor' });
  });

  it('redirects to /profesor for tutor role', async () => {
    const controller = new LoginController(makeAuthService({
      login: async () => ({ ok: true, role: 'tutor', mustChangePassword: false }),
    }));
    const state = await controller.login('dbetqui', 'correctpass');
    expect(state).toEqual({ status: 'redirect', to: '/profesor' });
  });
});

// ── Element #3 — LoginController: invalid credentials ─────────────────────────

describe('Element #3 — LoginController: invalid credentials', () => {
  it('returns an error state with "Credenciales incorrectas" and no redirect', async () => {
    const controller = new LoginController(makeAuthService({
      login: async () => ({ ok: false, status: 401, code: 'INVALID_CREDENTIALS' }),
    }));
    const state = await controller.login('nadie', 'wrongpass');
    expect(state).toEqual({ status: 'error', message: 'Credenciales incorrectas' });
  });
});

// ── Element #3 — LoginController: account lockout messaging ──────────────────

describe('Element #3 — LoginController: account lockout messaging', () => {
  it('shows the Administrador message when a profesor account is locked', async () => {
    const controller = new LoginController(makeAuthService({
      login: async () => ({ ok: false, status: 423, code: 'ACCOUNT_LOCKED', role: 'profesor' }),
    }));
    const state = await controller.login('profesor1', 'wrong');
    expect(state).toEqual({
      status: 'error',
      message: 'Póngase en contacto con el Administrador',
    });
  });

  it('shows the Administrador message when a tutor account is locked', async () => {
    const controller = new LoginController(makeAuthService({
      login: async () => ({ ok: false, status: 423, code: 'ACCOUNT_LOCKED', role: 'tutor' }),
    }));
    const state = await controller.login('dbetqui', 'wrong');
    expect(state).toEqual({
      status: 'error',
      message: 'Póngase en contacto con el Administrador',
    });
  });

  it('shows the soporte técnico message when an admin account is locked', async () => {
    const controller = new LoginController(makeAuthService({
      login: async () => ({ ok: false, status: 423, code: 'ACCOUNT_LOCKED', role: 'admin' }),
    }));
    const state = await controller.login('admin', 'wrong');
    expect(state).toEqual({
      status: 'error',
      message: 'Póngase en contacto con el soporte técnico',
    });
  });
});

// ── Element #3 — LoginController: first-login password change ────────────────

describe('Element #3 — LoginController: first-login password change', () => {
  it('returns password-change-required with the role when mustChangePassword is true', async () => {
    const controller = new LoginController(makeAuthService({
      login: async () => ({ ok: true, role: 'profesor', mustChangePassword: true }),
    }));
    const state = await controller.login('profesor1', '12345678');
    expect(state).toEqual({ status: 'password-change-required', role: 'profesor' });
  });

  it('updates the password and redirects to the role landing page when new passwords match', async () => {
    let called: { newPassword: string; confirmPassword: string } | null = null;
    const controller = new LoginController(makeAuthService({
      changePassword: async (newPassword, confirmPassword) => {
        called = { newPassword, confirmPassword };
        return { ok: true };
      },
    }));
    const state = await controller.changePassword('NewSecurePass1!', 'NewSecurePass1!', 'profesor');
    expect(state).toEqual({ status: 'redirect', to: '/profesor' });
    expect(called).toEqual({ newPassword: 'NewSecurePass1!', confirmPassword: 'NewSecurePass1!' });
  });

  it('redirects to /admin when the role pending password change is admin', async () => {
    const controller = new LoginController(makeAuthService());
    const state = await controller.changePassword('NewSecurePass1!', 'NewSecurePass1!', 'admin');
    expect(state).toEqual({ status: 'redirect', to: '/admin' });
  });

  it('shows a mismatch error and does not call the API when new passwords differ', async () => {
    let apiCalled = false;
    const controller = new LoginController(makeAuthService({
      changePassword: async () => {
        apiCalled = true;
        return { ok: true };
      },
    }));
    const state = await controller.changePassword('NewSecurePass1!', 'DifferentPass1!', 'profesor');
    expect(state).toEqual({ status: 'error', message: 'Las contraseñas no coinciden' });
    expect(apiCalled).toBe(false);
  });
});

// ── Element #3 — corrector-login-form: button rendering and interaction ──────

describe('Element #3 — corrector-login-form: button rendering and interaction', () => {
  function mount(authService: AuthService): CorrectorLoginForm {
    const el = document.createElement('corrector-login-form') as CorrectorLoginForm;
    el.authService = authService;
    document.body.appendChild(el);
    return el;
  }

  it('renders the submit button tagged with data-element-id="3"', () => {
    const el = mount(makeAuthService());
    const button = el.shadowRoot!.querySelector('[data-element-id="3"]');
    expect(button).not.toBeNull();
    expect(button?.tagName).toBe('BUTTON');
    el.remove();
  });

  it('shows a loading state while the login request is in flight', async () => {
    let resolveLogin!: (value: LoginApiResult) => void;
    const pending = new Promise<LoginApiResult>((resolve) => { resolveLogin = resolve; });
    const el = mount(makeAuthService({ login: () => pending }));

    const username = el.shadowRoot!.querySelector('[data-element-id="1"]') as HTMLInputElement;
    const password = el.shadowRoot!.querySelector('[data-element-id="2"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="3"]') as HTMLButtonElement;

    username.value = 'admin';
    username.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'Admin1234!';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();

    await Promise.resolve();
    expect(button.disabled).toBe(true);

    resolveLogin({ ok: true, role: 'admin', mustChangePassword: false });
    await pending;
    el.remove();
  });

  it('dispatches corrector:login-succeeded with the redirect target on success', async () => {
    const el = mount(makeAuthService({
      login: async () => ({ ok: true, role: 'admin', mustChangePassword: false }),
    }));
    const event = new Promise<CustomEvent>((resolve) => {
      el.addEventListener('corrector:login-succeeded', (e) => resolve(e as CustomEvent), { once: true });
    });

    const username = el.shadowRoot!.querySelector('[data-element-id="1"]') as HTMLInputElement;
    const password = el.shadowRoot!.querySelector('[data-element-id="2"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="3"]') as HTMLButtonElement;
    username.value = 'admin';
    username.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'Admin1234!';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();

    const detail = (await event).detail as { redirectTo: string };
    expect(detail.redirectTo).toBe('/admin');
    el.remove();
  });

  it('reveals inline password-change fields when mustChangePassword is true, without redirecting', async () => {
    const el = mount(makeAuthService({
      login: async () => ({ ok: true, role: 'profesor', mustChangePassword: true }),
    }));
    let redirected = false;
    el.addEventListener('corrector:login-succeeded', () => { redirected = true; });

    const username = el.shadowRoot!.querySelector('[data-element-id="1"]') as HTMLInputElement;
    const password = el.shadowRoot!.querySelector('[data-element-id="2"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="3"]') as HTMLButtonElement;
    username.value = 'profesor1';
    username.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = '12345678';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
    await Promise.resolve();
    await Promise.resolve();

    const passwordInputs = el.shadowRoot!.querySelectorAll('input[type="password"]');
    expect(passwordInputs.length).toBeGreaterThanOrEqual(2);
    expect(redirected).toBe(false);
    el.remove();
  });

  it('keeps the user on the login screen and shows a mismatch error when new passwords differ', async () => {
    const changePassword = async (): Promise<ChangePasswordApiResult> => ({ ok: true });
    const el = mount(makeAuthService({
      login: async () => ({ ok: true, role: 'profesor', mustChangePassword: true }),
      changePassword,
    }));
    let redirected = false;
    el.addEventListener('corrector:login-succeeded', () => { redirected = true; });

    const username = el.shadowRoot!.querySelector('[data-element-id="1"]') as HTMLInputElement;
    const password = el.shadowRoot!.querySelector('[data-element-id="2"]') as HTMLInputElement;
    const button = el.shadowRoot!.querySelector('[data-element-id="3"]') as HTMLButtonElement;
    username.value = 'profesor1';
    username.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = '12345678';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    button.click();
    await Promise.resolve();
    await Promise.resolve();

    const passwordInputs = Array.from(
      el.shadowRoot!.querySelectorAll('input[type="password"]'),
    ) as HTMLInputElement[];
    passwordInputs[1]!.value = 'NewSecurePass1!';
    passwordInputs[1]!.dispatchEvent(new Event('input', { bubbles: true }));
    passwordInputs[2]!.value = 'DifferentPass1!';
    passwordInputs[2]!.dispatchEvent(new Event('input', { bubbles: true }));
    // Re-query: the login phase's re-render replaced the button node.
    const changePasswordButton = el.shadowRoot!.querySelector('[data-element-id="3"]') as HTMLButtonElement;
    changePasswordButton.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(el.shadowRoot!.textContent).toMatch(/no coinciden/i);
    expect(redirected).toBe(false);
    el.remove();
  });
});
