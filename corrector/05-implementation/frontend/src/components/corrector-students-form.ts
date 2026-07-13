import { html, render } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { HttpStudentService } from '../services/student.service';
import type { StudentService } from '../services/student.service';
import { HttpLegislationService } from '../services/legislation.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import { HttpCycleService } from '../services/cycle.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import { HttpModuleService } from '../services/module.service';
import type { Module, ModuleService } from '../services/module.service';
import { StudentController } from '../controllers/student-controller';
import type { StudentRow } from '../controllers/student-controller';
import { renderGestionNav, GESTION_TAB_PATHS } from './gestion-nav';
import type { GestionTab } from './gestion-nav';
import { renderOptionSelect } from './option-select';
import { FormCascadeEngine } from '../controllers/form-cascade-engine';

const FILTER_DEBOUNCE_MS = 300;

// corrector-students-form
// sketchNumbers: 48 (nombre), 49 (año — navegación), 50 (legislación —
// navegación), 51 (ciclo — FK real student.cycle_id), 52 (módulo — FK real
// vía student_module), 53 (Nuevo), 54 (Subir lista), 55 (filtro nombre), 56
// (filtro año), 57 (filtro legislación), 58 (filtro ciclo), 59 (filtro
// módulo), 60 (tabla)
export class CorrectorStudentsForm extends HTMLElement {
  studentService?: StudentService;
  legislationService?: LegislationService;
  cycleService?: CycleService;
  moduleService?: ModuleService;

  private _controller!: StudentController;
  private _cascade!: FormCascadeEngine;
  private _disposables: Array<() => void> = [];

  private _rows: StudentRow[] = [];

  private _name = '';
  private _nameError = false;
  private _formLoading = false;
  private _formErrorMessage = '';

  private _nameFilter = '';
  private _yearFilter = '';
  private _legislationFilter = '';
  private _cycleFilter = '';
  private _moduleFilter = '';
  private _filterTimeout: ReturnType<typeof setTimeout> | null = null;

  private _editingId: number | null = null;
  private _editName = '';
  private _editLoading = false;
  private _editErrorMessage = '';

  private _rowErrorMessage = '';
  private _uploadLoading = false;
  private _uploadErrorMessage = '';

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const legislationService = this.legislationService ?? new HttpLegislationService();
    const cycleService = this.cycleService ?? new HttpCycleService();
    const moduleService = this.moduleService ?? new HttpModuleService();
    this._controller = new StudentController(
      this.studentService ?? new HttpStudentService(),
      legislationService,
      cycleService,
      moduleService,
    );
    this._cascade = new FormCascadeEngine(
      legislationService, cycleService, moduleService,
      { year: 49, legislation: 50, cycle: 51, module: 52 },
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

  private _handleNameInput = (e: Event): void => {
    this._name = (e.target as HTMLInputElement).value;
    this._nameError = false;
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
      this._name.trim(),
      this._cascade.selectedYear,
      this._cascade.selectedLegislation,
      this._cascade.selectedCycle,
      this._cascade.selectedModule,
    );
    this._formLoading = false;

    if (state.status === 'success') {
      const selectedModuleObj = this._cascade.moduleOptions.find((m) => String(m.id) === this._cascade.selectedModule);
      const startYear = this._cascade.selectedYear === '' ? null : Number(this._cascade.selectedYear);
      this._rows = [...this._rows, {
        ...state.item,
        legislationName: selectedModuleObj?.legislationName ?? null,
        startYear,
      }];
      this._name = '';
      this._nameError = false;
      this._cascade.reset();
      this._render();
      return;
    }

    if (state.status === 'validation-error') {
      this._nameError = state.errors.name;
      this._cascade.errors = {
        year: state.errors.year,
        legislation: state.errors.legislation,
        cycle: state.errors.cycle,
        module: state.errors.module,
      };
      this._render();
      return;
    }

    this._formErrorMessage = state.message;
    this._render();
  }

  private _handleUploadChange = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    void this._submitUpload(file);
  };

  private async _submitUpload(file: File): Promise<void> {
    this._uploadLoading = true;
    this._uploadErrorMessage = '';
    this._render();

    const state = await this._controller.upload(file);
    this._uploadLoading = false;

    if (state.status === 'success') {
      this._rows = await this._controller.list();
      this._render();
      return;
    }

    this._uploadErrorMessage = state.message;
    this._render();
  }

  private _handleNameFilterInput = (e: Event): void => {
    this._nameFilter = (e.target as HTMLInputElement).value;
    this._scheduleFilter();
  };

  private _handleYearFilterChange = (e: Event): void => {
    this._yearFilter = (e.target as HTMLSelectElement).value;
    this._scheduleFilter();
  };

  private _handleLegislationFilterChange = (e: Event): void => {
    this._legislationFilter = (e.target as HTMLSelectElement).value;
    this._cycleFilter = '';
    this._moduleFilter = '';
    this._scheduleFilter();
  };

  private _handleCycleFilterChange = (e: Event): void => {
    this._cycleFilter = (e.target as HTMLSelectElement).value;
    this._moduleFilter = '';
    this._scheduleFilter();
  };

  private _handleModuleFilterChange = (e: Event): void => {
    this._moduleFilter = (e.target as HTMLSelectElement).value;
    this._scheduleFilter();
  };

  private _scheduleFilter(): void {
    this._render();
    if (this._filterTimeout) clearTimeout(this._filterTimeout);
    this._filterTimeout = setTimeout(() => void this._applyFilters(), FILTER_DEBOUNCE_MS);
  }

  private async _applyFilters(): Promise<void> {
    this._rows = await this._controller.filterRows(this._nameFilter, this._yearFilter, this._legislationFilter, this._cycleFilter, this._moduleFilter);
    this._render();
  }

  private _startEdit = (row: StudentRow): void => {
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
      this._rows = this._rows.map((row) => (row.id === id ? { ...row, name: state.item.name } : row));
      this._editingId = null;
      this._render();
      return;
    }

    this._editErrorMessage = state.status === 'validation-error' ? 'Datos no válidos' : state.message;
    this._render();
  }

  private _handleDeleteClick = (row: StudentRow): void => {
    void this._handleDelete(row);
  };

  private async _handleDelete(row: StudentRow): Promise<void> {
    const confirmed = window.confirm(`¿Eliminar al alumno ${row.name}?`);
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

  private _handleNavigateClick = (tab: GestionTab): void => {
    this.dispatchEvent(new CustomEvent('corrector:gestion-nav-selected', {
      bubbles: true,
      composed: true,
      detail: { to: GESTION_TAB_PATHS[tab] },
    }));
  };

  private _render(): void {
    render(this._template(), this.shadowRoot!);
  }

  private _template(): TemplateResult {
    return html`
      ${renderGestionNav('alumnos', this._handleLogoutClick, this._handleNavigateClick)}

      <div role="alert">${this._formErrorMessage}</div>
      <form>
        <fieldset>
          <legend>Nuevo alumno:</legend>
          <input
            data-element-id="48"
            type="text"
            placeholder="Nombre del alumno"
            .value=${this._name}
            aria-invalid=${this._nameError ? 'true' : 'false'}
            @input=${this._handleNameInput}
          />
          ${this._cascade.render()}
          <div>
            <button
              data-element-id="53"
              type="button"
              ?disabled=${this._formLoading}
              @click=${this._handleSubmitClick}
            >
              Nuevo
            </button>
            <input
              data-element-id="54"
              type="file"
              accept=".csv,.json,.yaml,.yml"
              ?disabled=${this._uploadLoading}
              @change=${this._handleUploadChange}
            />
          </div>
        </fieldset>
      </form>
      <div role="alert">${this._uploadErrorMessage}</div>

      <fieldset>
        <legend>Filtrar por:</legend>
        <input
          data-element-id="55"
          type="text"
          placeholder="Filtrar por nombre"
          .value=${this._nameFilter}
          @input=${this._handleNameFilterInput}
        />
        ${renderOptionSelect({
          sketchNumber: 56, options: this._cascade.yearOptions, getId: (y) => y, getLabel: (y) => String(y),
          selectedValue: this._yearFilter, placeholder: 'Seleccionar año', onChange: this._handleYearFilterChange,
        })}
        ${renderOptionSelect({
          sketchNumber: 57, options: this._cascade.legislationOptions, getId: (l) => l.id, getLabel: (l) => l.name,
          selectedValue: this._legislationFilter, placeholder: 'Seleccionar legislación', onChange: this._handleLegislationFilterChange,
        })}
        ${renderOptionSelect({
          sketchNumber: 58, options: this._cascade.cycleOptions, getId: (c) => c.id, getLabel: (c) => c.name,
          selectedValue: this._cycleFilter, placeholder: 'Seleccionar ciclo',
          disabled: this._legislationFilter === '', onChange: this._handleCycleFilterChange,
        })}
        ${renderOptionSelect({
          sketchNumber: 59, options: this._cascade.moduleOptions, getId: (m) => m.id, getLabel: (m) => m.name,
          selectedValue: this._moduleFilter, placeholder: 'Seleccionar módulo',
          disabled: this._cycleFilter === '', onChange: this._handleModuleFilterChange,
        })}
      </fieldset>

      <div role="alert">${this._rowErrorMessage}</div>
      <table data-element-id="60">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Módulo</th>
            <th>Ciclo</th>
            <th>Legislación</th>
            <th>Año de inicio</th>
            <th>Editar</th>
            <th>Borrar</th>
          </tr>
        </thead>
        <tbody>
          ${this._rows.map((row) => (row.id === this._editingId ? this._editRowTemplate(row) : this._rowTemplate(row)))}
        </tbody>
      </table>
      ${this._rows.length === 0 ? html`<p>No hay alumnos registrados</p>` : ''}
    `;
  }

  private _rowTemplate(row: StudentRow): TemplateResult {
    return html`
      <tr>
        <td>${row.name}</td>
        <td>${row.modules.map((m) => m.name).join(', ')}</td>
        <td>${row.cycleName}</td>
        <td>${row.legislationName ?? ''}</td>
        <td>${row.startYear ?? ''}</td>
        <td><button data-action="edit" @click=${() => this._startEdit(row)}>Icono editar</button></td>
        <td><button data-action="delete" @click=${() => this._handleDeleteClick(row)}>Icono borrar</button></td>
      </tr>
    `;
  }

  private _editRowTemplate(row: StudentRow): TemplateResult {
    return html`
      <tr>
        <td><input type="text" .value=${this._editName} @input=${this._handleEditNameInput} /></td>
        <td>${row.modules.map((m) => m.name).join(', ')}</td>
        <td>${row.cycleName}</td>
        <td>${row.legislationName ?? ''}</td>
        <td>${row.startYear ?? ''}</td>
        <td>
          <button data-action="save" ?disabled=${this._editLoading} @click=${() => this._handleSaveEditClick(row.id)}>Guardar</button>
        </td>
        <td></td>
      </tr>
    `;
  }
}
customElements.define('corrector-students-form', CorrectorStudentsForm);
