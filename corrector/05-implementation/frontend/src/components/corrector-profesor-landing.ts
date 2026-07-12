import { html, render } from 'lit-html';
import { HttpAuthService } from '../services/auth.service';
import type { AuthService, TeacherRole } from '../services/auth.service';
import { ProfesorLandingController } from '../controllers/profesor-landing-controller';

// corrector-profesor-landing
// sketchNumber: 47 (Imprimir notas — tutor only)
//
// Gestionar/Corregir/Visualizar notas have no data-element-id in the boceto
// (see ui-spec.json screen-profesor-landing notes: "navigation elements not
// requiring individual spec"). All three are now enabled — every target
// screen exists. Visualizar notas and #47 (Imprimir notas, tutor only) both
// point at /profesor/notas: it's the same screen for both roles, per
// screen-ver-notas's own route/notes in ui-spec.json (role determines
// which columns/modules render, not which route is used).
export class CorrectorProfesorLanding extends HTMLElement {
  authService?: AuthService;

  private _controller!: ProfesorLandingController;
  private _disposables: Array<() => void> = [];

  private _role: TeacherRole | null = null;

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._controller = new ProfesorLandingController(this.authService ?? new HttpAuthService());
    this._render();
    void this._loadRole();
  }

  disconnectedCallback(): void {
    this._disposables.forEach((dispose) => dispose());
    this._disposables = [];
  }

  private async _loadRole(): Promise<void> {
    this._role = await this._controller.loadRole();
    this._render();
  }

  private _handleLogoutClick = (): void => {
    this.dispatchEvent(new CustomEvent('corrector:logout', { bubbles: true, composed: true }));
  };

  private _handlePrintNotesClick = (): void => {
    this.dispatchEvent(new CustomEvent('corrector:profesor-landing-navigate', {
      bubbles: true, composed: true,
      detail: { to: '/profesor/notas' },
    }));
  };

  private _handleGestionarClick = (): void => {
    this.dispatchEvent(new CustomEvent('corrector:profesor-landing-navigate', {
      bubbles: true, composed: true,
      detail: { to: '/profesor/gestionar/alumnos' },
    }));
  };

  private _handleCorregirClick = (): void => {
    this.dispatchEvent(new CustomEvent('corrector:profesor-landing-navigate', {
      bubbles: true, composed: true,
      detail: { to: '/profesor/corregir' },
    }));
  };

  private _handleVerNotasClick = (): void => {
    this.dispatchEvent(new CustomEvent('corrector:profesor-landing-navigate', {
      bubbles: true, composed: true,
      detail: { to: '/profesor/notas' },
    }));
  };

  private _template() {
    return html`
      <nav>
        <span>Corrector de proyectos</span>
        <span>Bienvenido</span>
        <button data-action="logout" @click=${this._handleLogoutClick}>Salir</button>
      </nav>
      <section class="landing-actions">
        <button type="button" data-action="navigate-gestionar" @click=${this._handleGestionarClick}>Gestionar</button>
        <button type="button" data-action="navigate-corregir" @click=${this._handleCorregirClick}>Corregir</button>
        <button type="button" data-action="navigate-notas" @click=${this._handleVerNotasClick}>Visualizar notas</button>
        ${this._role === 'tutor'
          ? html`<button type="button" data-element-id="47" @click=${this._handlePrintNotesClick}>Imprimir notas</button>`
          : ''}
      </section>
    `;
  }

  private _render(): void {
    render(this._template(), this.shadowRoot!);
  }
}
customElements.define('corrector-profesor-landing', CorrectorProfesorLanding);
