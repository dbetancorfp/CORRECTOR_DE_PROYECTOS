import { html, render } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { HttpLegislationService } from '../services/legislation.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import { LegislationController } from '../controllers/legislation-controller';
import { renderAdminNav, ADMIN_TAB_PATHS } from './admin-nav';
import type { AdminTab } from './admin-nav';
import { runDeleteRowFlow } from '../controllers/delete-row-flow';
import { runCreateRowFlow } from '../controllers/create-row-flow';
import { runEditRowFlow } from '../controllers/edit-row-flow';

const FILTER_DEBOUNCE_MS = 300;

// corrector-legislation-form
// sketchNumbers: 4 (tab), 5 (siglas), 6 (año inicio), 7 (Guardar), 8 (filtro año),
// 9 (filtro siglas), 10 (tabla)
//
// Renders the legislación fields directly (no nested custom elements), same
// flat Shadow DOM approach as corrector-login-form, so Cypress and unit tests
// can reach native elements at [data-element-id="N"] without piercing a
// second, nested shadow root.
export class CorrectorLegislationForm extends HTMLElement {
  legislationService?: LegislationService;

  private _controller!: LegislationController;
  private _disposables: Array<() => void> = [];

  private _rows: Legislation[] = [];

  private _name = '';
  private _startYear = '';
  private _nameError = false;
  private _startYearError = false;
  private _formLoading = false;
  private _formErrorMessage = '';

  private _yearFilter = '';
  private _nameFilter = '';
  private _filterTimeout: ReturnType<typeof setTimeout> | null = null;

  private _editingId: number | null = null;
  private _editName = '';
  private _editStartYear = '';
  private _editLoading = false;
  private _editErrorMessage = '';

  private _rowErrorMessage = '';

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._controller = new LegislationController(this.legislationService ?? new HttpLegislationService());
    this._render();
    void this._loadRows();
    this._disposables.push(() => {
      if (this._filterTimeout) clearTimeout(this._filterTimeout);
    });
  }

  disconnectedCallback(): void {
    this._disposables.forEach((dispose) => dispose());
    this._disposables = [];
  }

  private async _loadRows(): Promise<void> {
    this._rows = await this._controller.list();
    this._render();
  }

  private _handleNameInput = (e: Event): void => {
    this._name = (e.target as HTMLInputElement).value;
    this._nameError = false;
    this._render();
  };

  private _handleStartYearInput = (e: Event): void => {
    this._startYear = (e.target as HTMLInputElement).value;
    this._startYearError = false;
    this._render();
  };

  private _handleFormKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') void this._submitCreate();
  };

  private _handleSubmitClick = (): void => {
    void this._submitCreate();
  };

  private async _submitCreate(): Promise<void> {
    await runCreateRowFlow(
      (loading) => { this._formLoading = loading; },
      (message) => { this._formErrorMessage = message; },
      () => this._render(),
      () => this._controller.create(this._name.trim(), Number(this._startYear)),
      (item) => {
        this._rows = [...this._rows, item];
        this._name = '';
        this._startYear = '';
        this._nameError = false;
        this._startYearError = false;
      },
      (errors) => {
        this._nameError = errors.name;
        this._startYearError = errors.startYear;
      },
    );
  }

  private _handleYearFilterInput = (e: Event): void => {
    this._yearFilter = (e.target as HTMLInputElement).value;
    this._scheduleFilter();
  };

  private _handleNameFilterInput = (e: Event): void => {
    this._nameFilter = (e.target as HTMLInputElement).value;
    this._scheduleFilter();
  };

  private _scheduleFilter(): void {
    if (this._filterTimeout) clearTimeout(this._filterTimeout);
    this._filterTimeout = setTimeout(() => this._render(), FILTER_DEBOUNCE_MS);
  }

  private _startEdit = (row: Legislation): void => {
    this._editingId = row.id;
    this._editName = row.name;
    this._editStartYear = String(row.startYear);
    this._editErrorMessage = '';
    this._render();
  };

  private _handleEditNameInput = (e: Event): void => {
    this._editName = (e.target as HTMLInputElement).value;
  };

  private _handleEditStartYearInput = (e: Event): void => {
    this._editStartYear = (e.target as HTMLInputElement).value;
  };

  private _handleSaveEditClick = (id: number): void => {
    void this._saveEdit(id);
  };

  private async _saveEdit(id: number): Promise<void> {
    await runEditRowFlow(
      (loading) => { this._editLoading = loading; },
      () => this._render(),
      () => this._controller.update(id, this._editName.trim(), Number(this._editStartYear)),
      (item) => {
        this._rows = this._rows.map((row) => (row.id === id ? item : row));
        this._editingId = null;
      },
      (message) => { this._editErrorMessage = message; },
    );
  }

  private _handleDeleteClick = (row: Legislation): void => {
    void this._handleDelete(row);
  };

  private _handleLogoutClick = (): void => {
    this.dispatchEvent(new CustomEvent('corrector:logout', { bubbles: true, composed: true }));
  };

  private _handleNavigateClick = (tab: AdminTab): void => {
    this.dispatchEvent(new CustomEvent('corrector:admin-nav-selected', {
      bubbles: true,
      composed: true,
      detail: { to: ADMIN_TAB_PATHS[tab] },
    }));
  };

  private async _handleDelete(row: Legislation): Promise<void> {
    this._rowErrorMessage = '';
    await runDeleteRowFlow(
      `¿Eliminar la legislación ${row.name}?`,
      () => this._controller.delete(row.id),
      () => { this._rows = this._rows.filter((r) => r.id !== row.id); },
      (message) => { this._rowErrorMessage = message; },
    );
    this._render();
  }

  private _render(): void {
    render(this._template(), this.shadowRoot!);
  }

  private _template(): TemplateResult {
    const visibleRows = this._controller.filterRows(this._rows, this._yearFilter, this._nameFilter);

    return html`
      ${renderAdminNav('legislacion', this._handleLogoutClick, this._handleNavigateClick)}

      <div role="alert">${this._formErrorMessage}</div>
      <form>
        <fieldset>
          <legend>Nueva legislación:</legend>
          <input
            data-element-id="5"
            type="text"
            placeholder="Siglas (ej. LOMLOE)"
            .value=${this._name}
            aria-invalid=${this._nameError ? 'true' : 'false'}
            @input=${this._handleNameInput}
            @keydown=${this._handleFormKeydown}
          />
          <input
            data-element-id="6"
            type="text"
            placeholder="Año de inicio"
            .value=${this._startYear}
            aria-invalid=${this._startYearError ? 'true' : 'false'}
            @input=${this._handleStartYearInput}
            @keydown=${this._handleFormKeydown}
          />
          <button
            data-element-id="7"
            type="button"
            ?disabled=${this._formLoading}
            @click=${this._handleSubmitClick}
          >
            Guardar
          </button>
        </fieldset>
      </form>

      <fieldset>
        <legend>Filtrar por:</legend>
        <input
          data-element-id="8"
          type="text"
          placeholder="Filtrar por año de inicio"
          .value=${this._yearFilter}
          @input=${this._handleYearFilterInput}
        />
        <input
          data-element-id="9"
          type="text"
          placeholder="Filtrar por siglas"
          .value=${this._nameFilter}
          @input=${this._handleNameFilterInput}
        />
      </fieldset>

      <div role="alert">${this._rowErrorMessage}</div>
      <table data-element-id="10">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Año inicial</th>
            <th>Editar</th>
            <th>Borrar</th>
          </tr>
        </thead>
        <tbody>
          ${visibleRows.map((row) => (row.id === this._editingId ? this._editRowTemplate(row) : this._rowTemplate(row)))}
        </tbody>
      </table>
      ${this._rows.length === 0 ? html`<p>No hay legislaciones registradas</p>` : ''}
    `;
  }

  private _rowTemplate(row: Legislation): TemplateResult {
    return html`
      <tr>
        <td>${row.name}</td>
        <td>${row.startYear}</td>
        <td><button data-action="edit" @click=${() => this._startEdit(row)}>Icono editar</button></td>
        <td><button data-action="delete" @click=${() => this._handleDeleteClick(row)}>Icono borrar</button></td>
      </tr>
    `;
  }

  private _editRowTemplate(row: Legislation): TemplateResult {
    return html`
      <tr>
        <td>
          <input
            type="text"
            .value=${this._editName}
            @input=${this._handleEditNameInput}
          />
        </td>
        <td>
          <input
            type="text"
            .value=${this._editStartYear}
            @input=${this._handleEditStartYearInput}
          />
        </td>
        <td>
          <button
            data-action="save"
            ?disabled=${this._editLoading}
            @click=${() => this._handleSaveEditClick(row.id)}
          >
            Guardar
          </button>
        </td>
        <td></td>
      </tr>
    `;
  }
}

customElements.define('corrector-legislation-form', CorrectorLegislationForm);
