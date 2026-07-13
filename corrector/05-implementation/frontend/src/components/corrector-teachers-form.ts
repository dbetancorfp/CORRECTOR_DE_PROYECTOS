import { html, render } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { HttpTeacherService } from '../services/teacher.service';
import type { TeacherService } from '../services/teacher.service';
import { HttpLegislationService } from '../services/legislation.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import { HttpCycleService } from '../services/cycle.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import { HttpModuleService } from '../services/module.service';
import type { Module, ModuleService } from '../services/module.service';
import { TeacherController } from '../controllers/teacher-controller';
import type { TeacherRow } from '../controllers/teacher-controller';
import { renderAdminNav, ADMIN_TAB_PATHS } from './admin-nav';
import type { AdminTab } from './admin-nav';
import { renderOptionSelect } from './option-select';

const FILTER_DEBOUNCE_MS = 300;

// corrector-teachers-form
// sketchNumbers: 34 (tab), 35 (usuario), 36 (contraseña), 37 (año —
// navegación), 38 (legislación — navegación), 39 (ciclo — navegación), 40
// (módulo — FK real vía teacher_module), 41 (Guardar), 42 (filtro año), 43
// (filtro legislación), 44 (filtro ciclo), 45 (filtro módulo), 46 (tabla)
export class CorrectorTeachersForm extends HTMLElement {
  teacherService?: TeacherService;
  legislationService?: LegislationService;
  cycleService?: CycleService;
  moduleService?: ModuleService;

  private _controller!: TeacherController;
  private _disposables: Array<() => void> = [];

  private _rows: TeacherRow[] = [];

  private _username = '';
  private _password = '';
  private _selectedYear = '';
  private _selectedLegislation = '';
  private _selectedCycle = '';
  private _selectedModule = '';
  private _yearOptions: number[] = [];
  private _legislationOptions: Legislation[] = [];
  private _cycleOptions: Cycle[] = [];
  private _moduleOptions: Module[] = [];
  private _usernameError = false;
  private _passwordError = false;
  private _yearError = false;
  private _legislationError = false;
  private _cycleError = false;
  private _moduleError = false;
  private _formLoading = false;
  private _formErrorMessage = '';

  private _yearFilter = '';
  private _legislationFilter = '';
  private _cycleFilter = '';
  private _moduleFilter = '';
  private _filterTimeout: ReturnType<typeof setTimeout> | null = null;

  private _editingId: number | null = null;
  private _editUsername = '';
  private _editLoading = false;
  private _editErrorMessage = '';

  private _rowErrorMessage = '';

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._controller = new TeacherController(
      this.teacherService ?? new HttpTeacherService(),
      this.legislationService ?? new HttpLegislationService(),
      this.cycleService ?? new HttpCycleService(),
      this.moduleService ?? new HttpModuleService(),
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

  private _handleYearChange = (e: Event): void => {
    this._selectedYear = (e.target as HTMLSelectElement).value;
    this._selectedLegislation = '';
    this._selectedCycle = '';
    this._selectedModule = '';
    this._legislationOptions = [];
    this._cycleOptions = [];
    this._moduleOptions = [];
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
    this._selectedCycle = '';
    this._selectedModule = '';
    this._cycleOptions = [];
    this._moduleOptions = [];
    this._legislationError = false;
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
    this._selectedModule = '';
    this._moduleOptions = [];
    this._cycleError = false;
    this._render();
    void this._loadModuleOptions();
  };

  private async _loadModuleOptions(): Promise<void> {
    const cycleId = this._selectedCycle === '' ? null : Number(this._selectedCycle);
    this._moduleOptions = await this._controller.loadModuleOptions(cycleId);
    this._render();
  }

  private _handleModuleChange = (e: Event): void => {
    this._selectedModule = (e.target as HTMLSelectElement).value;
    this._moduleError = false;
    this._render();
  };

  private _handleSubmitClick = (): void => {
    void this._submitCreate();
  };

  private async _submitCreate(): Promise<void> {
    this._formLoading = true;
    this._formErrorMessage = '';
    this._render();

    const state = await this._controller.create(
      this._username.trim(),
      this._password,
      this._selectedYear,
      this._selectedLegislation,
      this._selectedCycle,
      this._selectedModule,
    );
    this._formLoading = false;

    if (state.status === 'success') {
      const selectedModuleObj = this._moduleOptions.find((m) => String(m.id) === this._selectedModule);
      const startYear = this._selectedYear === '' ? null : Number(this._selectedYear);
      this._rows = [...this._rows, {
        ...state.item,
        cycleName: selectedModuleObj?.cycleName ?? null,
        legislationName: selectedModuleObj?.legislationName ?? null,
        startYear,
      }];
      this._username = '';
      this._password = '';
      this._selectedYear = '';
      this._selectedLegislation = '';
      this._selectedCycle = '';
      this._selectedModule = '';
      this._legislationOptions = [];
      this._cycleOptions = [];
      this._moduleOptions = [];
      this._usernameError = false;
      this._passwordError = false;
      this._yearError = false;
      this._legislationError = false;
      this._cycleError = false;
      this._moduleError = false;
      this._render();
      return;
    }

    if (state.status === 'validation-error') {
      this._usernameError = state.errors.username;
      this._passwordError = state.errors.password;
      this._yearError = state.errors.year;
      this._legislationError = state.errors.legislation;
      this._cycleError = state.errors.cycle;
      this._moduleError = state.errors.module;
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

  private _handleCycleFilterInput = (e: Event): void => {
    this._cycleFilter = (e.target as HTMLInputElement).value;
    this._scheduleFilter();
  };

  private _handleModuleFilterInput = (e: Event): void => {
    this._moduleFilter = (e.target as HTMLInputElement).value;
    this._scheduleFilter();
  };

  private _scheduleFilter(): void {
    if (this._filterTimeout) clearTimeout(this._filterTimeout);
    this._filterTimeout = setTimeout(() => void this._applyFilters(), FILTER_DEBOUNCE_MS);
  }

  private async _applyFilters(): Promise<void> {
    this._rows = await this._controller.filterRows(this._yearFilter, this._legislationFilter, this._cycleFilter, this._moduleFilter);
    this._render();
  }

  private _startEdit = (row: TeacherRow): void => {
    this._editingId = row.id;
    this._editUsername = row.username;
    this._editErrorMessage = '';
    this._render();
  };

  private _handleEditUsernameInput = (e: Event): void => {
    this._editUsername = (e.target as HTMLInputElement).value;
  };

  private _handleSaveEditClick = (id: number): void => {
    void this._saveEdit(id);
  };

  private async _saveEdit(id: number): Promise<void> {
    this._editLoading = true;
    this._render();

    const state = await this._controller.update(id, this._editUsername.trim());
    this._editLoading = false;

    if (state.status === 'success') {
      this._rows = this._rows.map((row) => (row.id === id
        ? { ...row, username: state.item.username, passwordStatus: state.item.passwordStatus }
        : row));
      this._editingId = null;
      this._render();
      return;
    }

    this._editErrorMessage = state.status === 'validation-error' ? 'Datos no válidos' : state.message;
    this._render();
  }

  private _handleUnlockClick = (row: TeacherRow): void => {
    void this._unlock(row);
  };

  private async _unlock(row: TeacherRow): Promise<void> {
    const state = await this._controller.unlock(row.id);
    if (state.status === 'success') {
      this._rows = this._rows.map((r) => (r.id === row.id ? { ...r, accountLocked: false, failedLoginAttempts: 0 } : r));
      this._render();
      return;
    }
    this._rowErrorMessage = state.message;
    this._render();
  }

  private _handleDeleteClick = (row: TeacherRow): void => {
    void this._handleDelete(row);
  };

  private async _handleDelete(row: TeacherRow): Promise<void> {
    const confirmed = window.confirm(`¿Eliminar al profesor ${row.username}?`);
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
      ${renderAdminNav('profesorado', this._handleLogoutClick, this._handleNavigateClick)}

      <div role="alert">${this._formErrorMessage}</div>
      <form>
        <fieldset>
          <legend>Nuevo profesor:</legend>
          <input
            data-element-id="35"
            type="text"
            placeholder="Nombre de usuario"
            .value=${this._username}
            aria-invalid=${this._usernameError ? 'true' : 'false'}
            @input=${this._handleUsernameInput}
          />
          <input
            data-element-id="36"
            type="password"
            placeholder="Contraseña"
            .value=${this._password}
            aria-invalid=${this._passwordError ? 'true' : 'false'}
            @input=${this._handlePasswordInput}
          />
          ${renderOptionSelect({
            sketchNumber: 37, options: this._yearOptions, getId: (y) => y, getLabel: (y) => String(y),
            selectedValue: this._selectedYear, placeholder: 'Seleccionar año',
            invalid: this._yearError, onChange: this._handleYearChange,
          })}
          ${renderOptionSelect({
            sketchNumber: 38, options: this._legislationOptions, getId: (l) => l.id, getLabel: (l) => l.name,
            selectedValue: this._selectedLegislation, placeholder: 'Seleccionar legislación',
            disabled: this._selectedYear === '', invalid: this._legislationError, onChange: this._handleLegislationChange,
          })}
          ${renderOptionSelect({
            sketchNumber: 39, options: this._cycleOptions, getId: (c) => c.id, getLabel: (c) => c.name,
            selectedValue: this._selectedCycle, placeholder: 'Seleccionar ciclo',
            disabled: this._selectedYear === '' || this._selectedLegislation === '', invalid: this._cycleError, onChange: this._handleCycleChange,
          })}
          ${renderOptionSelect({
            sketchNumber: 40, options: this._moduleOptions, getId: (m) => m.id, getLabel: (m) => m.name,
            selectedValue: this._selectedModule, placeholder: 'Seleccionar módulo',
            disabled: this._selectedCycle === '', invalid: this._moduleError, onChange: this._handleModuleChange,
          })}
          <button
            data-element-id="41"
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
          data-element-id="42"
          type="text"
          placeholder="Filtrar por año de inicio"
          .value=${this._yearFilter}
          @input=${this._handleYearFilterInput}
        />
        <input
          data-element-id="43"
          type="text"
          placeholder="Filtrar por legislación"
          .value=${this._legislationFilter}
          @input=${this._handleLegislationFilterInput}
        />
        <input
          data-element-id="44"
          type="text"
          placeholder="Filtrar por ciclo"
          .value=${this._cycleFilter}
          @input=${this._handleCycleFilterInput}
        />
        <input
          data-element-id="45"
          type="text"
          placeholder="Filtrar por módulo"
          .value=${this._moduleFilter}
          @input=${this._handleModuleFilterInput}
        />
      </fieldset>

      <div role="alert">${this._rowErrorMessage}</div>
      <table data-element-id="46">
        <thead>
          <tr>
            <th>Usuario</th>
            <th>Contraseña</th>
            <th>Año</th>
            <th>Ciclo</th>
            <th>Módulos</th>
            <th>Editar</th>
            <th>Borrar</th>
          </tr>
        </thead>
        <tbody>
          ${this._rows.map((row) => (row.id === this._editingId ? this._editRowTemplate(row) : this._rowTemplate(row)))}
        </tbody>
      </table>
      ${this._rows.length === 0 ? html`<p>No hay profesores registrados</p>` : ''}
    `;
  }

  private _rowTemplate(row: TeacherRow): TemplateResult {
    const passwordDisplay = row.passwordStatus === 'default' ? '12345678' : '********';
    return html`
      <tr>
        <td>${row.username}</td>
        <td>${passwordDisplay}</td>
        <td>${row.startYear ?? ''}</td>
        <td>${row.cycleName ?? ''}</td>
        <td>${row.modules.map((m) => m.name).join(', ')}</td>
        <td>
          <button data-action="edit" @click=${() => this._startEdit(row)}>Icono editar</button>
          ${row.accountLocked ? html`<button data-action="unlock" @click=${() => this._handleUnlockClick(row)}>Desbloquear</button>` : ''}
        </td>
        <td><button data-action="delete" @click=${() => this._handleDeleteClick(row)}>Icono borrar</button></td>
      </tr>
    `;
  }

  private _editRowTemplate(row: TeacherRow): TemplateResult {
    const passwordDisplay = row.passwordStatus === 'default' ? '12345678' : '********';
    return html`
      <tr>
        <td>
          <input type="text" .value=${this._editUsername} @input=${this._handleEditUsernameInput} />
        </td>
        <td>${passwordDisplay}</td>
        <td>${row.startYear ?? ''}</td>
        <td>${row.cycleName ?? ''}</td>
        <td>${row.modules.map((m) => m.name).join(', ')}</td>
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

customElements.define('corrector-teachers-form', CorrectorTeachersForm);
