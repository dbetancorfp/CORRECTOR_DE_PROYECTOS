import { html, render } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { HttpModuleService } from '../services/module.service';
import type { ModuleService } from '../services/module.service';
import { HttpLegislationService } from '../services/legislation.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import { HttpCycleService } from '../services/cycle.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import { ModuleController } from '../controllers/module-controller';
import type { ModuleRow } from '../controllers/module-controller';
import { renderAdminNav, ADMIN_TAB_PATHS } from './admin-nav';
import type { AdminTab } from './admin-nav';
import { renderOptionSelect } from './option-select';
import { runDeleteRowFlow } from '../controllers/delete-row-flow';
import { runCreateRowFlow } from '../controllers/create-row-flow';
import { runEditRowFlow } from '../controllers/edit-row-flow';

const FILTER_DEBOUNCE_MS = 300;

// corrector-modules-form
// sketchNumbers: 22 (tab), 23 (nombre), 24 (horas semanales), 25 (legislación —
// FK real), 26 (año — navegación, no persiste), 27 (ciclo — FK real), 28
// (Guardar), 29 (filtro año), 30 (filtro legislación), 31 (filtro ciclo), 32
// (filtro nombre), 33 (tabla)
export class CorrectorModulesForm extends HTMLElement {
  moduleService?: ModuleService;
  legislationService?: LegislationService;
  cycleService?: CycleService;

  private _controller!: ModuleController;
  private _disposables: Array<() => void> = [];

  private _rows: ModuleRow[] = [];

  private _name = '';
  private _weeklyHours = '';
  private _selectedLegislation = '';
  private _selectedYear = '';
  private _selectedCycle = '';
  private _legislationOptions: Legislation[] = [];
  private _yearOptions: number[] = [];
  private _cycleOptions: Cycle[] = [];
  private _nameError = false;
  private _weeklyHoursError = false;
  private _legislationError = false;
  private _yearError = false;
  private _cycleError = false;
  private _formLoading = false;
  private _formErrorMessage = '';

  private _yearFilter = '';
  private _legislationFilter = '';
  private _cycleFilter = '';
  private _nameFilter = '';
  private _filterTimeout: ReturnType<typeof setTimeout> | null = null;

  private _editingId: number | null = null;
  private _editName = '';
  private _editWeeklyHours = '';
  private _editLoading = false;
  private _editErrorMessage = '';

  private _rowErrorMessage = '';

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._controller = new ModuleController(
      this.moduleService ?? new HttpModuleService(),
      this.legislationService ?? new HttpLegislationService(),
      this.cycleService ?? new HttpCycleService(),
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
    const [rows, legislationOptions] = await Promise.all([
      this._controller.list(),
      this._controller.loadLegislationOptions(),
    ]);
    this._rows = rows;
    this._legislationOptions = legislationOptions;
    this._render();
  }

  private _handleNameInput = (e: Event): void => {
    this._name = (e.target as HTMLInputElement).value;
    this._nameError = false;
    this._render();
  };

  private _handleWeeklyHoursInput = (e: Event): void => {
    this._weeklyHours = (e.target as HTMLInputElement).value;
    this._weeklyHoursError = false;
    this._render();
  };

  private _handleLegislationChange = (e: Event): void => {
    this._selectedLegislation = (e.target as HTMLSelectElement).value;
    this._selectedYear = '';
    this._selectedCycle = '';
    this._yearOptions = [];
    this._cycleOptions = [];
    this._legislationError = false;
    this._render();
    void this._loadYearOptions();
  };

  private async _loadYearOptions(): Promise<void> {
    const legislationId = this._selectedLegislation === '' ? null : Number(this._selectedLegislation);
    this._yearOptions = await this._controller.loadYearOptions(legislationId);
    this._render();
  }

  private _handleYearChange = (e: Event): void => {
    this._selectedYear = (e.target as HTMLSelectElement).value;
    this._selectedCycle = '';
    this._cycleOptions = [];
    this._yearError = false;
    this._render();
    void this._loadCycleOptions();
  };

  private async _loadCycleOptions(): Promise<void> {
    const legislationId = this._selectedLegislation === '' ? null : Number(this._selectedLegislation);
    this._cycleOptions = await this._controller.loadCycleOptions(legislationId);
    this._render();
  }

  private _handleCycleChange = (e: Event): void => {
    this._selectedCycle = (e.target as HTMLSelectElement).value;
    this._cycleError = false;
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
      () => this._controller.create(
        this._name.trim(),
        this._weeklyHours,
        this._selectedLegislation,
        this._selectedYear,
        this._selectedCycle,
      ),
      (item) => {
        const startYear = this._selectedYear === '' ? null : Number(this._selectedYear);
        this._rows = [...this._rows, { ...item, startYear }];
        this._name = '';
        this._weeklyHours = '';
        this._selectedLegislation = '';
        this._selectedYear = '';
        this._selectedCycle = '';
        this._yearOptions = [];
        this._cycleOptions = [];
        this._nameError = false;
        this._weeklyHoursError = false;
        this._legislationError = false;
        this._yearError = false;
        this._cycleError = false;
      },
      (errors) => {
        this._nameError = errors.name;
        this._weeklyHoursError = errors.weeklyHours;
        this._legislationError = errors.legislation;
        this._yearError = errors.year;
        this._cycleError = errors.cycle;
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

  private _handleCycleFilterInput = (e: Event): void => {
    this._cycleFilter = (e.target as HTMLInputElement).value;
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
    this._rows = await this._controller.filterRows(this._nameFilter, this._yearFilter, this._legislationFilter, this._cycleFilter);
    this._render();
  }

  private _startEdit = (row: ModuleRow): void => {
    this._editingId = row.id;
    this._editName = row.name;
    this._editWeeklyHours = String(row.weeklyHours);
    this._editErrorMessage = '';
    this._render();
  };

  private _handleEditNameInput = (e: Event): void => {
    this._editName = (e.target as HTMLInputElement).value;
  };

  private _handleEditWeeklyHoursInput = (e: Event): void => {
    this._editWeeklyHours = (e.target as HTMLInputElement).value;
  };

  private _handleSaveEditClick = (id: number): void => {
    void this._saveEdit(id);
  };

  private async _saveEdit(id: number): Promise<void> {
    await runEditRowFlow(
      (loading) => { this._editLoading = loading; },
      () => this._render(),
      () => this._controller.update(id, this._editName.trim(), this._editWeeklyHours),
      (item) => {
        this._rows = this._rows.map((row) => (row.id === id ? { ...item, startYear: row.startYear } : row));
        this._editingId = null;
      },
      (message) => { this._editErrorMessage = message; },
    );
  }

  private _handleDeleteClick = (row: ModuleRow): void => {
    void this._handleDelete(row);
  };

  private async _handleDelete(row: ModuleRow): Promise<void> {
    this._rowErrorMessage = '';
    await runDeleteRowFlow(
      `¿Eliminar el módulo ${row.name}?`,
      () => this._controller.delete(row.id),
      () => { this._rows = this._rows.filter((r) => r.id !== row.id); },
      (message) => { this._rowErrorMessage = message; },
    );
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
      ${renderAdminNav('modulos', this._handleLogoutClick, this._handleNavigateClick)}

      <div role="alert">${this._formErrorMessage}</div>
      <form>
        <fieldset>
          <legend>Nuevo módulo:</legend>
          <input
            data-element-id="23"
            type="text"
            placeholder="Nombre del módulo"
            .value=${this._name}
            aria-invalid=${this._nameError ? 'true' : 'false'}
            @input=${this._handleNameInput}
          />
          <input
            data-element-id="24"
            type="text"
            placeholder="Horas semanales"
            .value=${this._weeklyHours}
            aria-invalid=${this._weeklyHoursError ? 'true' : 'false'}
            @input=${this._handleWeeklyHoursInput}
          />
          ${renderOptionSelect({
            sketchNumber: 25, options: this._legislationOptions, getId: (l) => l.id, getLabel: (l) => l.name,
            selectedValue: this._selectedLegislation, placeholder: 'Seleccionar legislación',
            invalid: this._legislationError, onChange: this._handleLegislationChange,
          })}
          ${renderOptionSelect({
            sketchNumber: 26, options: this._yearOptions, getId: (y) => y, getLabel: (y) => String(y),
            selectedValue: this._selectedYear, placeholder: 'Seleccionar año',
            disabled: this._selectedLegislation === '', invalid: this._yearError, onChange: this._handleYearChange,
          })}
          ${renderOptionSelect({
            sketchNumber: 27, options: this._cycleOptions, getId: (c) => c.id, getLabel: (c) => c.name,
            selectedValue: this._selectedCycle, placeholder: 'Seleccionar ciclo',
            disabled: this._selectedLegislation === '' || this._selectedYear === '', invalid: this._cycleError, onChange: this._handleCycleChange,
          })}
          <button
            data-element-id="28"
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
          data-element-id="29"
          type="text"
          placeholder="Filtrar por año de inicio"
          .value=${this._yearFilter}
          @input=${this._handleYearFilterInput}
        />
        <input
          data-element-id="30"
          type="text"
          placeholder="Filtrar por legislación"
          .value=${this._legislationFilter}
          @input=${this._handleLegislationFilterInput}
        />
        <input
          data-element-id="31"
          type="text"
          placeholder="Filtrar por ciclo"
          .value=${this._cycleFilter}
          @input=${this._handleCycleFilterInput}
        />
        <input
          data-element-id="32"
          type="text"
          placeholder="Filtrar por módulo"
          .value=${this._nameFilter}
          @input=${this._handleNameFilterInput}
        />
      </fieldset>

      <div role="alert">${this._rowErrorMessage}</div>
      <table data-element-id="33">
        <thead>
          <tr>
            <th>Módulo</th>
            <th>Ciclo</th>
            <th>Año de inicio</th>
            <th>Legislación</th>
            <th>Horas semanales</th>
            <th>Editar</th>
            <th>Borrar</th>
          </tr>
        </thead>
        <tbody>
          ${this._rows.map((row) => (row.id === this._editingId ? this._editRowTemplate(row) : this._rowTemplate(row)))}
        </tbody>
      </table>
      ${this._rows.length === 0 ? html`<p>No hay módulos registrados</p>` : ''}
    `;
  }

  private _rowTemplate(row: ModuleRow): TemplateResult {
    return html`
      <tr>
        <td>${row.name}</td>
        <td>${row.cycleName}</td>
        <td>${row.startYear ?? ''}</td>
        <td>${row.legislationName}</td>
        <td>${row.weeklyHours}</td>
        <td><button data-action="edit" @click=${() => this._startEdit(row)}>Icono editar</button></td>
        <td><button data-action="delete" @click=${() => this._handleDeleteClick(row)}>Icono borrar</button></td>
      </tr>
    `;
  }

  private _editRowTemplate(row: ModuleRow): TemplateResult {
    return html`
      <tr>
        <td>
          <input type="text" .value=${this._editName} @input=${this._handleEditNameInput} />
        </td>
        <td>${row.cycleName}</td>
        <td>${row.startYear ?? ''}</td>
        <td>${row.legislationName}</td>
        <td>
          <input type="text" .value=${this._editWeeklyHours} @input=${this._handleEditWeeklyHoursInput} />
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

customElements.define('corrector-modules-form', CorrectorModulesForm);
