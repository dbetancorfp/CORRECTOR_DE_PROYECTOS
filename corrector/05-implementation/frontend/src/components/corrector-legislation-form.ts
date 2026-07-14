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
import { makeNavClickHandlers } from '../controllers/nav-click-handlers';
import { attachSharedStyles } from '../styles/shadow-styles';
import { classesFor } from '../styles/classes-for';

const FILTER_DEBOUNCE_MS = 300;
const TD_CLASS = classesFor('table-editable-cell');

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
  private _nav = makeNavClickHandlers<AdminTab>(this, 'corrector:admin-nav-selected', ADMIN_TAB_PATHS);

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
    attachSharedStyles(this.shadowRoot!);
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
      ${renderAdminNav('legislacion', this._nav.handleLogoutClick, this._nav.handleNavigateClick)}

      <div class="p-4">
        <div role="alert" class=${this._formErrorMessage ? classesFor('paragraph', 'danger') : ''}>${this._formErrorMessage}</div>
        <form>
          <fieldset class="border border-gray-200 rounded p-4 mb-4">
            <legend class="font-medium text-gray-900 px-1">Nueva legislación:</legend>
            <div class="flex flex-wrap items-end gap-3">
              <input
                data-element-id="5"
                type="text"
                class=${classesFor('text-input', this._nameError ? 'danger' : undefined)}
                placeholder="Siglas (ej. LOMLOE)"
                .value=${this._name}
                aria-invalid=${this._nameError ? 'true' : 'false'}
                @input=${this._handleNameInput}
                @keydown=${this._handleFormKeydown}
              />
              <input
                data-element-id="6"
                type="text"
                class=${classesFor('number-input', this._startYearError ? 'danger' : undefined)}
                placeholder="Año de inicio"
                .value=${this._startYear}
                aria-invalid=${this._startYearError ? 'true' : 'false'}
                @input=${this._handleStartYearInput}
                @keydown=${this._handleFormKeydown}
              />
              <button
                data-element-id="7"
                type="button"
                class=${classesFor('submit-button', 'primary')}
                ?disabled=${this._formLoading}
                @click=${this._handleSubmitClick}
              >
                Guardar
              </button>
            </div>
          </fieldset>
        </form>

        <fieldset class="border border-gray-200 rounded p-4 mb-4">
          <legend class="font-medium text-gray-900 px-1">Filtrar por:</legend>
          <div class="flex flex-wrap items-end gap-3">
            <input
              data-element-id="8"
              type="text"
              class=${classesFor('reactive-filter')}
              placeholder="Filtrar por año de inicio"
              .value=${this._yearFilter}
              @input=${this._handleYearFilterInput}
            />
            <input
              data-element-id="9"
              type="text"
              class=${classesFor('reactive-filter')}
              placeholder="Filtrar por siglas"
              .value=${this._nameFilter}
              @input=${this._handleNameFilterInput}
            />
          </div>
        </fieldset>

        <div role="alert" class=${this._rowErrorMessage ? classesFor('paragraph', 'danger') : ''}>${this._rowErrorMessage}</div>
        <table class=${classesFor('table')} data-element-id="10">
          <thead>
            <tr>
              <th class=${classesFor('table-header-cell')}>Nombre</th>
              <th class=${classesFor('table-header-cell')}>Año inicial</th>
              <th class=${classesFor('table-header-cell')}>Editar</th>
              <th class=${classesFor('table-header-cell')}>Borrar</th>
            </tr>
          </thead>
          <tbody>
            ${visibleRows.map((row) => (row.id === this._editingId ? this._editRowTemplate(row) : this._rowTemplate(row)))}
          </tbody>
        </table>
        ${this._rows.length === 0 ? html`<p class=${classesFor('paragraph')}>No hay legislaciones registradas</p>` : ''}
      </div>
    `;
  }

  private _rowTemplate(row: Legislation): TemplateResult {
    return html`
      <tr>
        <td class=${TD_CLASS}>${row.name}</td>
        <td class=${TD_CLASS}>${row.startYear}</td>
        <td class=${TD_CLASS}><button class=${classesFor('icon-button')} data-action="edit" @click=${() => this._startEdit(row)}>Icono editar</button></td>
        <td class=${TD_CLASS}><button class=${classesFor('icon-button', 'danger')} data-action="delete" @click=${() => this._handleDeleteClick(row)}>Icono borrar</button></td>
      </tr>
    `;
  }

  private _editRowTemplate(row: Legislation): TemplateResult {
    return html`
      <tr>
        <td class=${TD_CLASS}>
          <input
            type="text"
            class=${classesFor('text-input')}
            .value=${this._editName}
            @input=${this._handleEditNameInput}
          />
        </td>
        <td class=${TD_CLASS}>
          <input
            type="text"
            class=${classesFor('number-input')}
            .value=${this._editStartYear}
            @input=${this._handleEditStartYearInput}
          />
        </td>
        <td class=${TD_CLASS}>
          <button
            class=${classesFor('button', 'secondary', 'sm')}
            data-action="save"
            ?disabled=${this._editLoading}
            @click=${() => this._handleSaveEditClick(row.id)}
          >
            Guardar
          </button>
        </td>
        <td class=${TD_CLASS}></td>
      </tr>
    `;
  }
}

customElements.define('corrector-legislation-form', CorrectorLegislationForm);
