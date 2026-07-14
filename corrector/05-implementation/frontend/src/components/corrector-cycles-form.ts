import { html, render } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { HttpCycleService } from '../services/cycle.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import type { Legislation } from '../services/legislation.service';
import { HttpLegislationService } from '../services/legislation.service';
import type { LegislationService } from '../services/legislation.service';
import { CycleController } from '../controllers/cycle-controller';
import { renderAdminNav, ADMIN_TAB_PATHS } from './admin-nav';
import type { AdminTab } from './admin-nav';
import { renderOptionSelect } from './option-select';
import { runDeleteRowFlow } from '../controllers/delete-row-flow';
import { runCreateRowFlow } from '../controllers/create-row-flow';
import { runEditRowFlow } from '../controllers/edit-row-flow';
import { makeNavClickHandlers } from '../controllers/nav-click-handlers';
import { attachSharedStyles } from '../styles/shadow-styles';
import { classesFor } from '../styles/classes-for';

const FILTER_DEBOUNCE_MS = 300;
const TD_CLASS = classesFor('table-editable-cell');

// corrector-cycles-form
// sketchNumbers: 12 (tab), 13 (nombre), 14 (selector año — navegación), 15
// (selector legislación — navegación), 16 (Guardar), 17 (filtro año), 18
// (filtro legislación), 19 (filtro nombre), 20 (tabla)
//
// #21 ("Año finalización") is intentionally not rendered — cycle has no
// start_year field (schema.sql: id/name/created_at only); see
// functional-spec.json sketchNumber 21 for the full rationale.
export class CorrectorCyclesForm extends HTMLElement {
  cycleService?: CycleService;
  legislationService?: LegislationService;

  private _controller!: CycleController;
  private _disposables: Array<() => void> = [];
  private _nav = makeNavClickHandlers<AdminTab>(this, 'corrector:admin-nav-selected', ADMIN_TAB_PATHS);

  private _rows: Cycle[] = [];

  private _name = '';
  private _selectedYear = '';
  private _selectedLegislation = '';
  private _yearOptions: number[] = [];
  private _legislationOptions: Legislation[] = [];
  private _nameError = false;
  private _yearError = false;
  private _legislationError = false;
  private _formLoading = false;
  private _formErrorMessage = '';

  private _yearFilter = '';
  private _legislationFilter = '';
  private _nameFilter = '';
  private _filterTimeout: ReturnType<typeof setTimeout> | null = null;

  private _editingId: number | null = null;
  private _editName = '';
  private _editLoading = false;
  private _editErrorMessage = '';

  private _rowErrorMessage = '';

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    attachSharedStyles(this.shadowRoot!);
    this._controller = new CycleController(
      this.cycleService ?? new HttpCycleService(),
      this.legislationService ?? new HttpLegislationService(),
    );
    this._render();
    void this._loadInitial();
    this._disposables.push(() => {
      if (this._filterTimeout) clearTimeout(this._filterTimeout);
    });
  }

  disconnectedCallback(): void {
    this._disposables.forEach((dispose) => dispose());
    this._disposables = [];
  }

  private async _loadInitial(): Promise<void> {
    const [rows, yearOptions] = await Promise.all([
      this._controller.list(),
      this._controller.loadYearOptions(),
    ]);
    this._rows = rows;
    this._yearOptions = yearOptions;
    this._render();
  }

  private _handleNameInput = (e: Event): void => {
    this._name = (e.target as HTMLInputElement).value;
    this._nameError = false;
    this._render();
  };

  private _handleYearChange = (e: Event): void => {
    this._selectedYear = (e.target as HTMLSelectElement).value;
    this._selectedLegislation = '';
    this._legislationOptions = [];
    this._yearError = false;
    this._render();
    void this._loadLegislationOptions();
  };

  private async _loadLegislationOptions(): Promise<void> {
    const year = this._selectedYear === '' ? null : Number(this._selectedYear);
    this._legislationOptions = await this._controller.loadLegislationOptions(year);
    this._render();
  }

  private _handleLegislationChange = (e: Event): void => {
    this._selectedLegislation = (e.target as HTMLSelectElement).value;
    this._legislationError = false;
    this._render();
  };

  private _handleSubmitClick = (): void => {
    void this._submitCreate();
  };

  private async _submitCreate(): Promise<void> {
    await runCreateRowFlow(
      (loading) => { this._formLoading = loading; },
      (message) => { this._formErrorMessage = message; },
      () => this._render(),
      () => this._controller.create(this._name.trim(), this._selectedYear, this._selectedLegislation),
      (item) => {
        this._rows = [...this._rows, item];
        this._name = '';
        this._selectedYear = '';
        this._selectedLegislation = '';
        this._legislationOptions = [];
        this._nameError = false;
        this._yearError = false;
        this._legislationError = false;
      },
      (errors) => {
        this._nameError = errors.name;
        this._yearError = errors.year;
        this._legislationError = errors.legislation;
      },
    );
  }

  private _handleYearFilterInput = (e: Event): void => {
    this._yearFilter = (e.target as HTMLInputElement).value;
    this._scheduleFilter();
  };

  private _handleLegislationFilterInput = (e: Event): void => {
    this._legislationFilter = (e.target as HTMLInputElement).value;
    this._scheduleFilter();
  };

  private _handleNameFilterInput = (e: Event): void => {
    this._nameFilter = (e.target as HTMLInputElement).value;
    this._scheduleFilter();
  };

  private _scheduleFilter(): void {
    if (this._filterTimeout) clearTimeout(this._filterTimeout);
    this._filterTimeout = setTimeout(() => void this._applyFilters(), FILTER_DEBOUNCE_MS);
  }

  private async _applyFilters(): Promise<void> {
    this._rows = await this._controller.filterRows(this._nameFilter, this._yearFilter, this._legislationFilter);
    this._render();
  }

  private _startEdit = (row: Cycle): void => {
    this._editingId = row.id;
    this._editName = row.name;
    this._editErrorMessage = '';
    this._render();
  };

  private _handleEditNameInput = (e: Event): void => {
    this._editName = (e.target as HTMLInputElement).value;
  };

  private _handleSaveEditClick = (id: number): void => {
    void this._saveEdit(id);
  };

  private async _saveEdit(id: number): Promise<void> {
    await runEditRowFlow(
      (loading) => { this._editLoading = loading; },
      () => this._render(),
      () => this._controller.update(id, this._editName.trim()),
      (item) => {
        this._rows = this._rows.map((row) => (row.id === id ? item : row));
        this._editingId = null;
      },
      (message) => { this._editErrorMessage = message; },
    );
  }

  private _handleDeleteClick = (row: Cycle): void => {
    void this._handleDelete(row);
  };

  private async _handleDelete(row: Cycle): Promise<void> {
    this._rowErrorMessage = '';
    await runDeleteRowFlow(
      `¿Eliminar el ciclo ${row.name}?`,
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
    return html`
      ${renderAdminNav('ciclos', this._nav.handleLogoutClick, this._nav.handleNavigateClick)}

      <div class="p-4">
        <div role="alert" class=${this._formErrorMessage ? classesFor('paragraph', 'danger') : ''}>${this._formErrorMessage}</div>
        <form>
          <fieldset class="border border-gray-200 rounded p-4 mb-4">
            <legend class="font-medium text-gray-900 px-1">Nuevo ciclo:</legend>
            <div class="flex flex-wrap items-end gap-3">
              <input
                data-element-id="13"
                type="text"
                class=${classesFor('text-input', this._nameError ? 'danger' : undefined)}
                placeholder="Nombre del ciclo"
                .value=${this._name}
                aria-invalid=${this._nameError ? 'true' : 'false'}
                @input=${this._handleNameInput}
              />
              ${renderOptionSelect({
                sketchNumber: 14, options: this._yearOptions, getId: (y) => y, getLabel: (y) => String(y),
                selectedValue: this._selectedYear, placeholder: 'Seleccionar año',
                invalid: this._yearError, onChange: this._handleYearChange,
              })}
              ${renderOptionSelect({
                sketchNumber: 15, options: this._legislationOptions, getId: (l) => l.id, getLabel: (l) => l.name,
                selectedValue: this._selectedLegislation, placeholder: 'Seleccionar legislación',
                disabled: this._selectedYear === '', invalid: this._legislationError, onChange: this._handleLegislationChange,
              })}
              <button
                data-element-id="16"
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
              data-element-id="17"
              type="text"
              class=${classesFor('reactive-filter')}
              placeholder="Filtrar por año de inicio de la legislación"
              .value=${this._yearFilter}
              @input=${this._handleYearFilterInput}
            />
            <input
              data-element-id="18"
              type="text"
              class=${classesFor('reactive-filter')}
              placeholder="Filtrar por legislación"
              .value=${this._legislationFilter}
              @input=${this._handleLegislationFilterInput}
            />
            <input
              data-element-id="19"
              type="text"
              class=${classesFor('reactive-filter')}
              placeholder="Filtrar por ciclo"
              .value=${this._nameFilter}
              @input=${this._handleNameFilterInput}
            />
          </div>
        </fieldset>

        <div role="alert" class=${this._rowErrorMessage ? classesFor('paragraph', 'danger') : ''}>${this._rowErrorMessage}</div>
        <table class=${classesFor('table')} data-element-id="20">
          <thead>
            <tr>
              <th class=${classesFor('table-header-cell')}>Ciclo</th>
              <th class=${classesFor('table-header-cell')}>Editar</th>
              <th class=${classesFor('table-header-cell')}>Borrar</th>
            </tr>
          </thead>
          <tbody>
            ${this._rows.map((row) => (row.id === this._editingId ? this._editRowTemplate(row) : this._rowTemplate(row)))}
          </tbody>
        </table>
        ${this._rows.length === 0 ? html`<p class=${classesFor('paragraph')}>No hay ciclos registrados</p>` : ''}
      </div>
    `;
  }

  private _rowTemplate(row: Cycle): TemplateResult {
    return html`
      <tr>
        <td class=${TD_CLASS}>${row.name}</td>
        <td class=${TD_CLASS}><button class=${classesFor('icon-button')} data-action="edit" @click=${() => this._startEdit(row)}>Icono editar</button></td>
        <td class=${TD_CLASS}><button class=${classesFor('icon-button', 'danger')} data-action="delete" @click=${() => this._handleDeleteClick(row)}>Icono borrar</button></td>
      </tr>
    `;
  }

  private _editRowTemplate(row: Cycle): TemplateResult {
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

customElements.define('corrector-cycles-form', CorrectorCyclesForm);
