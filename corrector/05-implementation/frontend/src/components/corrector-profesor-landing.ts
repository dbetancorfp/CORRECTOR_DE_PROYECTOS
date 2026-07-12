import { html, render } from 'lit-html';
import { HttpAuthService } from '../services/auth.service';
import type { AuthService, TeacherRole } from '../services/auth.service';
import { ProfesorLandingController } from '../controllers/profesor-landing-controller';

// corrector-profesor-landing
// sketchNumber: 47 (Imprimir notas — tutor only)
//
// Gestionar/Corregir/Visualizar notas have no data-element-id in the boceto
// (see ui-spec.json screen-profesor-landing notes: "navigation elements not
// requiring individual spec"). Visualizar notas stays a disabled placeholder
// because its target screen (/profesor/notas) doesn't exist yet — same
// precedent as admin-nav's disabled tabs before Ciclos/Módulos/Profesorado
// were implemented. Gestionar and Corregir are enabled now that their target
// screens exist. #47 does carry an explicit acceptance criterion (UC-10)
// requiring it to navigate on click, so it stays enabled even though its own
// target screen isn't built yet either.
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
        <button type="button" data-action="navigate-notas" disabled>Visualizar notas</button>
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
