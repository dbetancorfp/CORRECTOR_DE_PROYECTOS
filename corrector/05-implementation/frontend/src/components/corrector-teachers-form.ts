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
import { FormCascadeEngine } from '../controllers/form-cascade-engine';
import { runDeleteRowFlow } from '../controllers/delete-row-flow';
import { runCreateRowFlow } from '../controllers/create-row-flow';
import { runEditRowFlow } from '../controllers/edit-row-flow';
import { makeNavClickHandlers } from '../controllers/nav-click-handlers';
import { attachSharedStyles } from '../styles/shadow-styles';
import { classesFor } from '../styles/classes-for';

const FILTER_DEBOUNCE_MS = 300;
const TD_CLASS = classesFor('table-editable-cell');

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
  private _cascade!: FormCascadeEngine;
  private _disposables: Array<() => void> = [];
  private _nav = makeNavClickHandlers<AdminTab>(this, 'corrector:admin-nav-selected', ADMIN_TAB_PATHS);

  private _rows: TeacherRow[] = [];

  private _username = '';
  private _password = '';
  private _usernameError = false;
  private _passwordError = false;
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
    attachSharedStyles(this.shadowRoot!);
    const legislationService = this.legislationService ?? new HttpLegislationService();
    const cycleService = this.cycleService ?? new HttpCycleService();
    const moduleService = this.moduleService ?? new HttpModuleService();
    this._controller = new TeacherController(
      this.teacherService ?? new HttpTeacherService(),
      legislationService,
      cycleService,
      moduleService,
    );
    this._cascade = new FormCascadeEngine(
      legislationService, cycleService, moduleService,
      { year: 37, legislation: 38, cycle: 39, module: 40 },
      () => this._render(),
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
    const [rows] = await Promise.all([
      this._controller.list(),
      this._cascade.loadYearOptions(),
    ]);
    this._rows = rows;
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

  private _handleSubmitClick = (): void => {
    void this._submitCreate();
  };

  private async _submitCreate(): Promise<void> {
    await runCreateRowFlow(
      (loading) => { this._formLoading = loading; },
      (message) => { this._formErrorMessage = message; },
      () => this._render(),
      () => this._controller.create(
        this._username.trim(),
        this._password,
        this._cascade.selectedYear,
        this._cascade.selectedLegislation,
        this._cascade.selectedCycle,
        this._cascade.selectedModule,
      ),
      (item) => {
        const selectedModuleObj = this._cascade.moduleOptions.find((m) => String(m.id) === this._cascade.selectedModule);
        const startYear = this._cascade.selectedYear === '' ? null : Number(this._cascade.selectedYear);
        this._rows = [...this._rows, {
          ...item,
          cycleName: selectedModuleObj?.cycleName ?? null,
          legislationName: selectedModuleObj?.legislationName ?? null,
          startYear,
        }];
        this._username = '';
        this._password = '';
        this._usernameError = false;
        this._passwordError = false;
        this._cascade.reset();
      },
      (errors) => {
        this._usernameError = errors.username;
        this._passwordError = errors.password;
        this._cascade.errors = { year: errors.year, legislation: errors.legislation, cycle: errors.cycle, module: errors.module };
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
    await runEditRowFlow(
      (loading) => { this._editLoading = loading; },
      () => this._render(),
      () => this._controller.update(id, this._editUsername.trim()),
      (item) => {
        this._rows = this._rows.map((row) => (row.id === id
          ? { ...row, username: item.username, passwordStatus: item.passwordStatus }
          : row));
        this._editingId = null;
      },
      (message) => { this._editErrorMessage = message; },
    );
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
    this._rowErrorMessage = '';
    await runDeleteRowFlow(
      `¿Eliminar al profesor ${row.username}?`,
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
      ${renderAdminNav('profesorado', this._nav.handleLogoutClick, this._nav.handleNavigateClick)}

      <div class="p-4">
        <div role="alert" class=${this._formErrorMessage ? classesFor('paragraph', 'danger') : ''}>${this._formErrorMessage}</div>
        <form>
          <fieldset class="border border-gray-200 rounded p-4 mb-4">
            <legend class="font-medium text-gray-900 px-1">Nuevo profesor:</legend>
            <div class="flex flex-wrap items-end gap-3">
              <input
                data-element-id="35"
                type="text"
                class=${classesFor('text-input', this._usernameError ? 'danger' : undefined)}
                placeholder="Nombre de usuario"
                .value=${this._username}
                aria-invalid=${this._usernameError ? 'true' : 'false'}
                @input=${this._handleUsernameInput}
              />
              <input
                data-element-id="36"
                type="password"
                class=${classesFor('password-input', this._passwordError ? 'danger' : undefined)}
                placeholder="Contraseña"
                .value=${this._password}
                aria-invalid=${this._passwordError ? 'true' : 'false'}
                @input=${this._handlePasswordInput}
              />
              ${this._cascade.render()}
              <button
                data-element-id="41"
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
              data-element-id="42"
              type="text"
              class=${classesFor('reactive-filter')}
              placeholder="Filtrar por año de inicio"
              .value=${this._yearFilter}
              @input=${this._handleYearFilterInput}
            />
            <input
              data-element-id="43"
              type="text"
              class=${classesFor('reactive-filter')}
              placeholder="Filtrar por legislación"
              .value=${this._legislationFilter}
              @input=${this._handleLegislationFilterInput}
            />
            <input
              data-element-id="44"
              type="text"
              class=${classesFor('reactive-filter')}
              placeholder="Filtrar por ciclo"
              .value=${this._cycleFilter}
              @input=${this._handleCycleFilterInput}
            />
            <input
              data-element-id="45"
              type="text"
              class=${classesFor('reactive-filter')}
              placeholder="Filtrar por módulo"
              .value=${this._moduleFilter}
              @input=${this._handleModuleFilterInput}
            />
          </div>
        </fieldset>

        <div role="alert" class=${this._rowErrorMessage ? classesFor('paragraph', 'danger') : ''}>${this._rowErrorMessage}</div>
        <table class=${classesFor('table')} data-element-id="46">
          <thead>
            <tr>
              <th class=${classesFor('table-header-cell')}>Usuario</th>
              <th class=${classesFor('table-header-cell')}>Contraseña</th>
              <th class=${classesFor('table-header-cell')}>Año</th>
              <th class=${classesFor('table-header-cell')}>Ciclo</th>
              <th class=${classesFor('table-header-cell')}>Módulos</th>
              <th class=${classesFor('table-header-cell')}>Editar</th>
              <th class=${classesFor('table-header-cell')}>Borrar</th>
            </tr>
          </thead>
          <tbody>
            ${this._rows.map((row) => (row.id === this._editingId ? this._editRowTemplate(row) : this._rowTemplate(row)))}
          </tbody>
        </table>
        ${this._rows.length === 0 ? html`<p class=${classesFor('paragraph')}>No hay profesores registrados</p>` : ''}
      </div>
    `;
  }

  private _rowTemplate(row: TeacherRow): TemplateResult {
    const passwordDisplay = row.passwordStatus === 'default' ? '12345678' : '********';
    return html`
      <tr>
        <td class=${TD_CLASS}>${row.username}</td>
        <td class=${TD_CLASS}>${passwordDisplay}</td>
        <td class=${TD_CLASS}>${row.startYear ?? ''}</td>
        <td class=${TD_CLASS}>${row.cycleName ?? ''}</td>
        <td class=${TD_CLASS}>${row.modules.map((m) => m.name).join(', ')}</td>
        <td class=${TD_CLASS}>
          <button class=${classesFor('icon-button')} data-action="edit" @click=${() => this._startEdit(row)}>Icono editar</button>
          ${row.accountLocked ? html`<button class=${classesFor('button', 'secondary', 'sm')} data-action="unlock" @click=${() => this._handleUnlockClick(row)}>Desbloquear</button>` : ''}
        </td>
        <td class=${TD_CLASS}><button class=${classesFor('icon-button', 'danger')} data-action="delete" @click=${() => this._handleDeleteClick(row)}>Icono borrar</button></td>
      </tr>
    `;
  }

  private _editRowTemplate(row: TeacherRow): TemplateResult {
    const passwordDisplay = row.passwordStatus === 'default' ? '12345678' : '********';
    return html`
      <tr>
        <td class=${TD_CLASS}>
          <input type="text" class=${classesFor('text-input')} .value=${this._editUsername} @input=${this._handleEditUsernameInput} />
        </td>
        <td class=${TD_CLASS}>${passwordDisplay}</td>
        <td class=${TD_CLASS}>${row.startYear ?? ''}</td>
        <td class=${TD_CLASS}>${row.cycleName ?? ''}</td>
        <td class=${TD_CLASS}>${row.modules.map((m) => m.name).join(', ')}</td>
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

customElements.define('corrector-teachers-form', CorrectorTeachersForm);
