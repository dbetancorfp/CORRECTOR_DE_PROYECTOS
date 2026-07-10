import { html, render } from 'lit-html';
import { HttpAuthService } from '../services/auth.service';
import type { AuthService, TeacherRole } from '../services/auth.service';
import { LoginController } from '../controllers/login-controller';

type Phase = 'login' | 'change-password';

// corrector-login-form
// sketchNumbers: 1 (username), 2 (password), 3 (submit button)
//
// Renders the login fields directly (no nested custom elements) so both
// Cypress and unit tests can reach native <input>/<button> elements at
// [data-element-id="N"] without piercing a second, nested shadow root.
export class CorrectorLoginForm extends HTMLElement {
  authService?: AuthService;

  private _controller!: LoginController;
  private _disposables: Array<() => void> = [];

  private _username = '';
  private _password = '';
  private _newPassword = '';
  private _confirmPassword = '';
  private _phase: Phase = 'login';
  private _pendingRole: TeacherRole | null = null;
  private _loading = false;
  private _usernameError = false;
  private _passwordError = false;
  private _errorMessage = '';

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._controller = new LoginController(this.authService ?? new HttpAuthService());
    this._render();
  }

  disconnectedCallback(): void {
    this._disposables.forEach((dispose) => dispose());
    this._disposables = [];
  }

  private _handleUsernameInput = (e: Event): void => {
    this._username = (e.target as HTMLInputElement).value;
    this._usernameError = false;
    this._render();
  };

  private _handlePasswordInput = (e: Event): void => {
    this._password = (e.target as HTMLInputElement).value;
    this._passwordError = false;
    this._render();
  };

  private _handleNewPasswordInput = (e: Event): void => {
    this._newPassword = (e.target as HTMLInputElement).value;
  };

  private _handleConfirmPasswordInput = (e: Event): void => {
    this._confirmPassword = (e.target as HTMLInputElement).value;
  };

  private _handleKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') this._submit();
  };

  private _handleSubmitClick = (): void => {
    this._submit();
  };

  private async _submit(): Promise<void> {
    if (this._phase === 'login') {
      await this._submitLogin();
    } else {
      await this._submitPasswordChange();
    }
  }

  private async _submitLogin(): Promise<void> {
    const usernameEmpty = this._username.length === 0;
    const passwordEmpty = this._password.length === 0;
    this._usernameError = usernameEmpty;
    this._passwordError = passwordEmpty;
    if (usernameEmpty || passwordEmpty) {
      this._render();
      return;
    }

    this._loading = true;
    this._errorMessage = '';
    this._render();

    const state = await this._controller.login(this._username, this._password);
    this._loading = false;

    if (state.status === 'redirect') {
      this.dispatchEvent(new CustomEvent('corrector:login-succeeded', {
        bubbles: true,
        composed: true,
        detail: { redirectTo: state.to },
      }));
      return;
    }

    if (state.status === 'password-change-required') {
      this._phase = 'change-password';
      this._pendingRole = state.role;
      this._render();
      return;
    }

    this._usernameError = true;
    this._passwordError = true;
    this._errorMessage = state.message;
    this._render();
  }

  private async _submitPasswordChange(): Promise<void> {
    if (!this._pendingRole) return;

    this._loading = true;
    this._errorMessage = '';
    this._render();

    const state = await this._controller.changePassword(
      this._newPassword,
      this._confirmPassword,
      this._pendingRole,
    );
    this._loading = false;

    if (state.status === 'redirect') {
      this.dispatchEvent(new CustomEvent('corrector:login-succeeded', {
        bubbles: true,
        composed: true,
        detail: { redirectTo: state.to },
      }));
      return;
    }

    this._errorMessage = state.message;
    this._render();
  }

  private _render(): void {
    const template = this._phase === 'login' ? this._loginTemplate() : this._changePasswordTemplate();
    render(template, this.shadowRoot!);
  }

  private _loginTemplate() {
    return html`
      <div role="alert">${this._errorMessage}</div>
      <input
        data-element-id="1"
        type="text"
        placeholder="Usuario"
        .value=${this._username}
        aria-invalid=${this._usernameError ? 'true' : 'false'}
        @input=${this._handleUsernameInput}
        @keydown=${this._handleKeydown}
      />
      <input
        data-element-id="2"
        type="password"
        placeholder="Contraseña"
        .value=${this._password}
        aria-invalid=${this._passwordError ? 'true' : 'false'}
        @input=${this._handlePasswordInput}
        @keydown=${this._handleKeydown}
      />
      <button
        data-element-id="3"
        ?disabled=${this._loading}
        @click=${this._handleSubmitClick}
      >
        Acceder
      </button>
    `;
  }

  private _changePasswordTemplate() {
    return html`
      <div role="alert">${this._errorMessage}</div>
      <input data-element-id="2" type="password" disabled .value=${this._password} />
      <input
        type="password"
        placeholder="Nueva contraseña"
        .value=${this._newPassword}
        @input=${this._handleNewPasswordInput}
        @keydown=${this._handleKeydown}
      />
      <input
        type="password"
        placeholder="Confirmar contraseña"
        .value=${this._confirmPassword}
        @input=${this._handleConfirmPasswordInput}
        @keydown=${this._handleKeydown}
      />
      <button
        data-element-id="3"
        ?disabled=${this._loading}
        @click=${this._handleSubmitClick}
      >
        Cambiar contraseña
      </button>
    `;
  }
}

customElements.define('corrector-login-form', CorrectorLoginForm);
