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

const FILTER_DEBOUNCE_MS = 300;

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
    this._formLoading = true;
    this._formErrorMessage = '';
    this._render();

    const state = await this._controller.create(this._name.trim(), this._selectedYear, this._selectedLegislation);
    this._formLoading = false;

    if (state.status === 'success') {
      this._rows = [...this._rows, state.item];
      this._name = '';
      this._selectedYear = '';
      this._selectedLegislation = '';
      this._legislationOptions = [];
      this._nameError = false;
      this._yearError = false;
      this._legislationError = false;
      this._render();
      return;
    }

    if (state.status === 'validation-error') {
      this._nameError = state.errors.name;
      this._yearError = state.errors.year;
      this._legislationError = state.errors.legislation;
      this._render();
      return;
    }

    this._formErrorMessage = state.message;
    this._render();
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
    this._editLoading = true;
    this._render();

    const state = await this._controller.update(id, this._editName.trim());
    this._editLoading = false;

    if (state.status === 'success') {
      this._rows = this._rows.map((row) => (row.id === id ? state.item : row));
      this._editingId = null;
      this._render();
      return;
    }

    this._editErrorMessage = state.status === 'validation-error' ? 'Datos no válidos' : state.message;
    this._render();
  }

  private _handleDeleteClick = (row: Cycle): void => {
    void this._handleDelete(row);
  };

  private async _handleDelete(row: Cycle): Promise<void> {
    const confirmed = window.confirm(`¿Eliminar el ciclo ${row.name}?`);
    if (!confirmed) return;

    this._rowErrorMessage = '';
    const state = await this._controller.delete(row.id);

    if (state.status === 'success') {
      this._rows = this._rows.filter((r) => r.id !== row.id);
      this._render();
      return;
    }

    this._rowErrorMessage = state.message;
    this._render();
  }

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

  private _render(): void {
    render(this._template(), this.shadowRoot!);
  }

  private _template(): TemplateResult {
    return html`
      ${renderAdminNav('ciclos', this._handleLogoutClick, this._handleNavigateClick)}

      <div role="alert">${this._formErrorMessage}</div>
      <form>
        <fieldset>
          <legend>Nuevo ciclo:</legend>
          <input
            data-element-id="13"
            type="text"
            placeholder="Nombre del ciclo"
            .value=${this._name}
            aria-invalid=${this._nameError ? 'true' : 'false'}
            @input=${this._handleNameInput}
          />
          <select
            data-element-id="14"
            aria-invalid=${this._yearError ? 'true' : 'false'}
            @change=${this._handleYearChange}
          >
            <option value="">Seleccionar año</option>
            ${this._yearOptions.map((year) => html`<option value=${year} ?selected=${String(year) === this._selectedYear}>${year}</option>`)}
          </select>
          <select
            data-element-id="15"
            ?disabled=${this._selectedYear === ''}
            aria-invalid=${this._legislationError ? 'true' : 'false'}
            @change=${this._handleLegislationChange}
          >
            <option value="">Seleccionar legislación</option>
            ${this._legislationOptions.map((leg) => html`<option value=${leg.id} ?selected=${String(leg.id) === this._selectedLegislation}>${leg.name}</option>`)}
          </select>
          <button
            data-element-id="16"
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
          data-element-id="17"
          type="text"
          placeholder="Filtrar por año de inicio de la legislación"
          .value=${this._yearFilter}
          @input=${this._handleYearFilterInput}
        />
        <input
          data-element-id="18"
          type="text"
          placeholder="Filtrar por legislación"
          .value=${this._legislationFilter}
          @input=${this._handleLegislationFilterInput}
        />
        <input
          data-element-id="19"
          type="text"
          placeholder="Filtrar por ciclo"
          .value=${this._nameFilter}
          @input=${this._handleNameFilterInput}
        />
      </fieldset>

      <div role="alert">${this._rowErrorMessage}</div>
      <table data-element-id="20">
        <thead>
          <tr>
            <th>Ciclo</th>
            <th>Editar</th>
            <th>Borrar</th>
          </tr>
        </thead>
        <tbody>
          ${this._rows.map((row) => (row.id === this._editingId ? this._editRowTemplate(row) : this._rowTemplate(row)))}
        </tbody>
      </table>
      ${this._rows.length === 0 ? html`<p>No hay ciclos registrados</p>` : ''}
    `;
  }

  private _rowTemplate(row: Cycle): TemplateResult {
    return html`
      <tr>
        <td>${row.name}</td>
        <td><button data-action="edit" @click=${() => this._startEdit(row)}>Icono editar</button></td>
        <td><button data-action="delete" @click=${() => this._handleDeleteClick(row)}>Icono borrar</button></td>
      </tr>
    `;
  }

  private _editRowTemplate(row: Cycle): TemplateResult {
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

customElements.define('corrector-cycles-form', CorrectorCyclesForm);
