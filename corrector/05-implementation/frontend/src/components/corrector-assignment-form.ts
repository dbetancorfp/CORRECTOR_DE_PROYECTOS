import { html, render } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { HttpProjectService } from '../services/project.service';
import type { ProjectService } from '../services/project.service';
import { HttpStudentService } from '../services/student.service';
import type { StudentService } from '../services/student.service';
import { HttpProjectStudentService } from '../services/project-student.service';
import type { ProjectStudentService, AssignedStudent } from '../services/project-student.service';
import { HttpLegislationService } from '../services/legislation.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import { HttpCycleService } from '../services/cycle.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import { HttpModuleService } from '../services/module.service';
import type { Module, ModuleService } from '../services/module.service';
import { ProjectController } from '../controllers/project-controller';
import type { ProjectRow } from '../controllers/project-controller';
import { StudentController } from '../controllers/student-controller';
import type { StudentRow } from '../controllers/student-controller';
import { AssignmentController } from '../controllers/assignment-controller';
import { renderGestionNav, GESTION_TAB_PATHS } from './gestion-nav';
import type { GestionTab } from './gestion-nav';
import { makeNavClickHandlers } from '../controllers/nav-click-handlers';
import { renderOptionSelect } from './option-select';
import { runDeleteRowFlow } from '../controllers/delete-row-flow';
import { runEditRowFlow } from '../controllers/edit-row-flow';
import { attachSharedStyles } from '../styles/shadow-styles';
import { classesFor } from '../styles/classes-for';

const FILTER_DEBOUNCE_MS = 300;
const TD_CLASS = classesFor('table-editable-cell');

// corrector-assignment-form
// sketchNumbers: 73-77 (filtro proyecto: nombre/año/legislación/ciclo/
// módulo, filtran la tabla #85), 78-82 (filtro alumno: mismo shape, filtran
// el pool de candidatos en #84), 83 (panel proyecto seleccionado —
// read-only), 84 (panel alumnos: asignados con botón Quitar + candidatos con
// checkbox), 121 (Agregar alumnos — asigna los candidatos marcados al
// proyecto seleccionado), 85 (tabla de proyectos — mismas columnas y
// acciones Editar/Borrar que #72 en Proyectos; clic en una fila selecciona
// el proyecto para #83/#84, ver decisión de usuario 2026-07-12: Editar/
// Borrar operan sobre el proyecto, no sobre una asignación individual — la
// desasignación de un alumno concreto se hace con "Quitar" en #84).
export class CorrectorAssignmentForm extends HTMLElement {
  projectService?: ProjectService;
  studentService?: StudentService;
  projectStudentService?: ProjectStudentService;
  legislationService?: LegislationService;
  cycleService?: CycleService;
  moduleService?: ModuleService;

  private _projectController!: ProjectController;
  private _studentController!: StudentController;
  private _assignmentController!: AssignmentController;
  private _disposables: Array<() => void> = [];
  private _nav = makeNavClickHandlers<GestionTab>(this, 'corrector:gestion-nav-selected', GESTION_TAB_PATHS);

  private _rows: ProjectRow[] = [];

  // Project filters (#73-77)
  private _projectNameFilter = '';
  private _projectYearFilter = '';
  private _projectLegislationFilter = '';
  private _projectCycleFilter = '';
  private _projectModuleFilter = '';
  private _projectYearOptions: number[] = [];
  private _projectLegislationOptions: Legislation[] = [];
  private _projectCycleOptions: Cycle[] = [];
  private _projectModuleOptions: Module[] = [];
  private _projectFilterTimeout: ReturnType<typeof setTimeout> | null = null;

  // Student pool filters (#78-82)
  private _studentNameFilter = '';
  private _studentYearFilter = '';
  private _studentLegislationFilter = '';
  private _studentCycleFilter = '';
  private _studentModuleFilter = '';
  private _studentYearOptions: number[] = [];
  private _studentLegislationOptions: Legislation[] = [];
  private _studentCycleOptions: Cycle[] = [];
  private _studentModuleOptions: Module[] = [];
  private _studentFilterTimeout: ReturnType<typeof setTimeout> | null = null;

  // Selection panel (#83/#84/#121)
  private _selectedProjectId: number | null = null;
  private _selectedProjectName: string | null = null;
  private _assignedStudents: AssignedStudent[] = [];
  private _candidates: StudentRow[] = [];
  private _selectedCandidateIds: Set<number> = new Set();
  private _assignLoading = false;
  private _assignErrorMessage = '';

  // Inline edit of a project row (#85), same shape as corrector-projects-form
  private _editingId: number | null = null;
  private _editName = '';
  private _editLoading = false;
  private _editErrorMessage = '';

  private _rowErrorMessage = '';

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    attachSharedStyles(this.shadowRoot!);
    const legislationService = this.legislationService ?? new HttpLegislationService();
    const cycleService = this.cycleService ?? new HttpCycleService();
    const moduleService = this.moduleService ?? new HttpModuleService();
    this._projectController = new ProjectController(
      this.projectService ?? new HttpProjectService(),
      legislationService, cycleService, moduleService,
    );
    this._studentController = new StudentController(
      this.studentService ?? new HttpStudentService(),
      legislationService, cycleService, moduleService,
    );
    this._assignmentController = new AssignmentController(
      this.projectStudentService ?? new HttpProjectStudentService(),
      this._studentController,
    );
    this._render();
    void this._loadInitial();
    this._disposables.push(() => {
      if (this._projectFilterTimeout) clearTimeout(this._projectFilterTimeout);
      if (this._studentFilterTimeout) clearTimeout(this._studentFilterTimeout);
    });
  }

  disconnectedCallback(): void {
    this._disposables.forEach((dispose) => dispose());
    this._disposables = [];
  }

  private async _loadInitial(): Promise<void> {
    const [rows, projectYearOptions, studentYearOptions] = await Promise.all([
      this._projectController.list(),
      this._projectController.loadYearOptions(),
      this._assignmentController.loadYearOptions(),
    ]);
    this._rows = rows;
    this._projectYearOptions = projectYearOptions;
    this._studentYearOptions = studentYearOptions;
    this._render();
  }

  // ── Project filters (#73-77) ──────────────────────────────────────────

  private _handleProjectNameFilterInput = (e: Event): void => {
    this._projectNameFilter = (e.target as HTMLInputElement).value;
    this._scheduleProjectFilter();
  };

  private _handleProjectYearFilterChange = (e: Event): void => {
    this._projectYearFilter = (e.target as HTMLSelectElement).value;
    this._scheduleProjectFilter();
  };

  private _handleProjectLegislationFilterChange = (e: Event): void => {
    this._projectLegislationFilter = (e.target as HTMLSelectElement).value;
    this._projectCycleFilter = '';
    this._projectModuleFilter = '';
    this._scheduleProjectFilter();
    void this._loadProjectCycleOptions();
  };

  private async _loadProjectCycleOptions(): Promise<void> {
    const legislationId = this._projectLegislationFilter === '' ? null : Number(this._projectLegislationFilter);
    this._projectCycleOptions = await this._projectController.loadCycleOptions(legislationId);
    this._render();
  }

  private _handleProjectCycleFilterChange = (e: Event): void => {
    this._projectCycleFilter = (e.target as HTMLSelectElement).value;
    this._projectModuleFilter = '';
    this._scheduleProjectFilter();
    void this._loadProjectModuleOptions();
  };

  private async _loadProjectModuleOptions(): Promise<void> {
    const cycleId = this._projectCycleFilter === '' ? null : Number(this._projectCycleFilter);
    this._projectModuleOptions = await this._projectController.loadModuleOptions(cycleId);
    this._render();
  }

  private _handleProjectModuleFilterChange = (e: Event): void => {
    this._projectModuleFilter = (e.target as HTMLSelectElement).value;
    this._scheduleProjectFilter();
  };

  private _scheduleProjectFilter(): void {
    this._render();
    if (this._projectFilterTimeout) clearTimeout(this._projectFilterTimeout);
    this._projectFilterTimeout = setTimeout(() => void this._applyProjectFilters(), FILTER_DEBOUNCE_MS);
  }

  private async _applyProjectFilters(): Promise<void> {
    this._rows = await this._projectController.filterRows(
      this._projectNameFilter, this._projectYearFilter, this._projectLegislationFilter,
      this._projectCycleFilter, this._projectModuleFilter,
    );
    this._render();
  }

  // ── Student pool filters (#78-82) ─────────────────────────────────────

  private _handleStudentNameFilterInput = (e: Event): void => {
    this._studentNameFilter = (e.target as HTMLInputElement).value;
    this._scheduleStudentFilter();
  };

  private _handleStudentYearFilterChange = (e: Event): void => {
    this._studentYearFilter = (e.target as HTMLSelectElement).value;
    this._scheduleStudentFilter();
  };

  private _handleStudentLegislationFilterChange = (e: Event): void => {
    this._studentLegislationFilter = (e.target as HTMLSelectElement).value;
    this._studentCycleFilter = '';
    this._studentModuleFilter = '';
    this._scheduleStudentFilter();
    void this._loadStudentCycleOptions();
  };

  private async _loadStudentCycleOptions(): Promise<void> {
    const legislationId = this._studentLegislationFilter === '' ? null : Number(this._studentLegislationFilter);
    this._studentCycleOptions = await this._assignmentController.loadCycleOptions(legislationId);
    this._render();
  }

  private _handleStudentCycleFilterChange = (e: Event): void => {
    this._studentCycleFilter = (e.target as HTMLSelectElement).value;
    this._studentModuleFilter = '';
    this._scheduleStudentFilter();
    void this._loadStudentModuleOptions();
  };

  private async _loadStudentModuleOptions(): Promise<void> {
    const cycleId = this._studentCycleFilter === '' ? null : Number(this._studentCycleFilter);
    this._studentModuleOptions = await this._assignmentController.loadModuleOptions(cycleId);
    this._render();
  }

  private _handleStudentModuleFilterChange = (e: Event): void => {
    this._studentModuleFilter = (e.target as HTMLSelectElement).value;
    this._scheduleStudentFilter();
  };

  private _scheduleStudentFilter(): void {
    this._render();
    if (this._studentFilterTimeout) clearTimeout(this._studentFilterTimeout);
    this._studentFilterTimeout = setTimeout(() => void this._applyStudentFilters(), FILTER_DEBOUNCE_MS);
  }

  private async _applyStudentFilters(): Promise<void> {
    if (this._selectedProjectId === null) return;
    this._candidates = await this._assignmentController.loadCandidates(
      this._selectedProjectId, this._studentNameFilter, this._studentYearFilter,
      this._studentLegislationFilter, this._studentCycleFilter, this._studentModuleFilter,
    );
    this._render();
  }

  // ── Selection panel (#83/#84/#121) ────────────────────────────────────

  private _handleRowClick = (row: ProjectRow): void => {
    this._selectedProjectId = row.id;
    this._selectedProjectName = row.name;
    this._selectedCandidateIds = new Set();
    this._assignErrorMessage = '';
    this._render();
    void this._loadAssignmentPanel();
  };

  private async _loadAssignmentPanel(): Promise<void> {
    if (this._selectedProjectId === null) return;
    const [assigned, candidates] = await Promise.all([
      this._assignmentController.loadAssignedStudents(this._selectedProjectId),
      this._assignmentController.loadCandidates(
        this._selectedProjectId, this._studentNameFilter, this._studentYearFilter,
        this._studentLegislationFilter, this._studentCycleFilter, this._studentModuleFilter,
      ),
    ]);
    this._assignedStudents = assigned;
    this._candidates = candidates;
    this._render();
  }

  private _handleCandidateToggle = (studentId: number, e: Event): void => {
    const checked = (e.target as HTMLInputElement).checked;
    const next = new Set(this._selectedCandidateIds);
    if (checked) next.add(studentId); else next.delete(studentId);
    this._selectedCandidateIds = next;
    this._render();
  };

  private _handleAssignClick = (): void => {
    void this._submitAssign();
  };

  private async _submitAssign(): Promise<void> {
    if (this._selectedProjectId === null || this._selectedCandidateIds.size === 0) return;

    this._assignLoading = true;
    this._assignErrorMessage = '';
    this._render();

    const state = await this._assignmentController.assign(this._selectedProjectId, Array.from(this._selectedCandidateIds));
    this._assignLoading = false;

    if (state.status === 'success') {
      this._selectedCandidateIds = new Set();
      await this._loadAssignmentPanel();
      return;
    }

    this._assignErrorMessage = state.message;
    this._render();
  }

  private _handleUnassignClick = (studentId: number): void => {
    void this._unassign(studentId);
  };

  private async _unassign(studentId: number): Promise<void> {
    if (this._selectedProjectId === null) return;

    this._assignErrorMessage = '';
    const state = await this._assignmentController.unassign(this._selectedProjectId, studentId);

    if (state.status === 'success') {
      await this._loadAssignmentPanel();
      return;
    }

    this._assignErrorMessage = state.message;
    this._render();
  }

  // ── Table #85: project-level edit/delete (same behaviour as #72) ─────

  private _startEdit = (row: ProjectRow, e: Event): void => {
    e.stopPropagation();
    this._editingId = row.id;
    this._editName = row.name;
    this._editErrorMessage = '';
    this._render();
  };

  private _handleEditNameInput = (e: Event): void => {
    this._editName = (e.target as HTMLInputElement).value;
  };

  private _handleSaveEditClick = (id: number, e: Event): void => {
    e.stopPropagation();
    void this._saveEdit(id);
  };

  private async _saveEdit(id: number): Promise<void> {
    await runEditRowFlow(
      (loading) => { this._editLoading = loading; },
      () => this._render(),
      () => this._projectController.update(id, this._editName.trim()),
      (item) => {
        this._rows = this._rows.map((row) => (row.id === id ? { ...row, name: item.name } : row));
        if (id === this._selectedProjectId) this._selectedProjectName = item.name;
        this._editingId = null;
      },
      (message) => { this._editErrorMessage = message; },
    );
  }

  private _handleDeleteClick = (row: ProjectRow, e: Event): void => {
    e.stopPropagation();
    void this._handleDelete(row);
  };

  private async _handleDelete(row: ProjectRow): Promise<void> {
    this._rowErrorMessage = '';
    await runDeleteRowFlow(
      `¿Eliminar el proyecto ${row.name}?`,
      () => this._projectController.delete(row.id),
      () => {
        this._rows = this._rows.filter((r) => r.id !== row.id);
        if (row.id === this._selectedProjectId) {
          this._selectedProjectId = null;
          this._selectedProjectName = null;
          this._assignedStudents = [];
          this._candidates = [];
        }
      },
      (message) => { this._rowErrorMessage = message; },
    );
    this._render();
  }

  private _render(): void {
    render(this._template(), this.shadowRoot!);
  }

  private _template(): TemplateResult {
    const assignDisabled = this._selectedProjectId === null || this._selectedCandidateIds.size === 0 || this._assignLoading;
    return html`
      ${renderGestionNav('asignacion', this._nav.handleLogoutClick, this._nav.handleNavigateClick)}

      <div class="p-4">
        <div role="alert" class=${this._rowErrorMessage ? classesFor('paragraph', 'danger') : ''}>${this._rowErrorMessage}</div>

        <div class="doscolfilter grid grid-cols-2 gap-4 mb-4">
          <fieldset class="border border-gray-200 rounded p-4">
            <legend class="font-medium text-gray-900 px-1">Filtrar por proyecto:</legend>
            <div class="flex flex-wrap items-end gap-3">
              <input data-element-id="73" type="text" class=${classesFor('reactive-filter')} placeholder="Filtrar por proyecto" .value=${this._projectNameFilter} @input=${this._handleProjectNameFilterInput} />
              ${renderOptionSelect({
                sketchNumber: 74, options: this._projectYearOptions, getId: (y) => y, getLabel: (y) => String(y),
                selectedValue: this._projectYearFilter, placeholder: 'Seleccionar año', onChange: this._handleProjectYearFilterChange,
              })}
              ${renderOptionSelect({
                sketchNumber: 75, options: this._projectLegislationOptions, getId: (l) => l.id, getLabel: (l) => l.name,
                selectedValue: this._projectLegislationFilter, placeholder: 'Seleccionar legislación', onChange: this._handleProjectLegislationFilterChange,
              })}
              ${renderOptionSelect({
                sketchNumber: 76, options: this._projectCycleOptions, getId: (c) => c.id, getLabel: (c) => c.name,
                selectedValue: this._projectCycleFilter, placeholder: 'Seleccionar ciclo',
                disabled: this._projectLegislationFilter === '', onChange: this._handleProjectCycleFilterChange,
              })}
              ${renderOptionSelect({
                sketchNumber: 77, options: this._projectModuleOptions, getId: (m) => m.id, getLabel: (m) => m.name,
                selectedValue: this._projectModuleFilter, placeholder: 'Seleccionar módulo',
                disabled: this._projectCycleFilter === '', onChange: this._handleProjectModuleFilterChange,
              })}
            </div>
          </fieldset>

          <fieldset class="border border-gray-200 rounded p-4">
            <legend class="font-medium text-gray-900 px-1">Filtrar por alumno:</legend>
            <div class="flex flex-wrap items-end gap-3">
              <input data-element-id="78" type="text" class=${classesFor('reactive-filter')} placeholder="Filtrar por nombre" .value=${this._studentNameFilter} @input=${this._handleStudentNameFilterInput} />
              ${renderOptionSelect({
                sketchNumber: 79, options: this._studentYearOptions, getId: (y) => y, getLabel: (y) => String(y),
                selectedValue: this._studentYearFilter, placeholder: 'Seleccionar año', onChange: this._handleStudentYearFilterChange,
              })}
              ${renderOptionSelect({
                sketchNumber: 80, options: this._studentLegislationOptions, getId: (l) => l.id, getLabel: (l) => l.name,
                selectedValue: this._studentLegislationFilter, placeholder: 'Seleccionar legislación', onChange: this._handleStudentLegislationFilterChange,
              })}
              ${renderOptionSelect({
                sketchNumber: 81, options: this._studentCycleOptions, getId: (c) => c.id, getLabel: (c) => c.name,
                selectedValue: this._studentCycleFilter, placeholder: 'Seleccionar ciclo',
                disabled: this._studentLegislationFilter === '', onChange: this._handleStudentCycleFilterChange,
              })}
              ${renderOptionSelect({
                sketchNumber: 82, options: this._studentModuleOptions, getId: (m) => m.id, getLabel: (m) => m.name,
                selectedValue: this._studentModuleFilter, placeholder: 'Seleccionar módulo',
                disabled: this._studentCycleFilter === '', onChange: this._handleStudentModuleFilterChange,
              })}
            </div>
          </fieldset>
        </div>

        <div class="trescolfilter flex flex-col gap-3 mb-4">
          <fieldset class="border border-gray-200 rounded p-4" data-element-id="83">
            <legend class="font-medium text-gray-900 px-1">Proyecto:</legend>
            <span class="text-gray-900">${this._selectedProjectName ?? ''}</span>
          </fieldset>

          <div role="alert" class=${this._assignErrorMessage ? classesFor('paragraph', 'danger') : ''}>${this._assignErrorMessage}</div>
          <button class=${classesFor('submit-button', 'primary')} data-element-id="121" type="button" ?disabled=${assignDisabled} @click=${this._handleAssignClick}>Agregar alumnos</button>

          <fieldset class="border border-gray-200 rounded p-4" data-element-id="84">
            <legend class="font-medium text-gray-900 px-1">Alumnos:</legend>
            <div class="flex flex-col gap-2">
              ${this._assignedStudents.map((s) => html`
                <div class="flex items-center gap-2">
                  <span class="text-gray-900">${s.name}</span>
                  <button class=${classesFor('button', 'secondary', 'sm')} data-action="unassign" @click=${() => this._handleUnassignClick(s.studentId)}>Quitar</button>
                </div>
              `)}
              ${this._candidates.map((s) => html`
                <label class="flex items-center gap-2">
                  <input type="checkbox" class=${classesFor('checkbox')} data-student=${s.id} .checked=${this._selectedCandidateIds.has(s.id)} @change=${(e: Event) => this._handleCandidateToggle(s.id, e)} />
                  ${s.name}
                </label>
              `)}
            </div>
          </fieldset>
        </div>

        <table class=${classesFor('table')} data-element-id="85">
          <thead>
            <tr>
              <th class=${classesFor('table-header-cell')}>Nombre</th>
              <th class=${classesFor('table-header-cell')}>Módulo</th>
              <th class=${classesFor('table-header-cell')}>Ciclo</th>
              <th class=${classesFor('table-header-cell')}>Legislación</th>
              <th class=${classesFor('table-header-cell')}>Año de inicio</th>
              <th class=${classesFor('table-header-cell')}>Editar</th>
              <th class=${classesFor('table-header-cell')}>Borrar</th>
            </tr>
          </thead>
          <tbody>
            ${this._rows.map((row) => (row.id === this._editingId ? this._editRowTemplate(row) : this._rowTemplate(row)))}
          </tbody>
        </table>
        ${this._rows.length === 0 ? html`<p class=${classesFor('paragraph')}>No hay proyectos registrados</p>` : ''}
      </div>
    `;
  }

  private _rowTemplate(row: ProjectRow): TemplateResult {
    const selected = row.id === this._selectedProjectId;
    return html`
      <tr class=${'cursor-pointer hover:bg-gray-50' + (selected ? ' bg-primary-50' : '')} @click=${() => this._handleRowClick(row)}>
        <td class=${TD_CLASS}>${row.name}</td>
        <td class=${TD_CLASS}>${row.moduleName}</td>
        <td class=${TD_CLASS}>${row.cycleName}</td>
        <td class=${TD_CLASS}>${row.legislationName ?? ''}</td>
        <td class=${TD_CLASS}>${row.startYear ?? ''}</td>
        <td class=${TD_CLASS}><button class=${classesFor('icon-button')} data-action="edit" @click=${(e: Event) => this._startEdit(row, e)}>Icono editar</button></td>
        <td class=${TD_CLASS}><button class=${classesFor('icon-button', 'danger')} data-action="delete" @click=${(e: Event) => this._handleDeleteClick(row, e)}>Icono borrar</button></td>
      </tr>
    `;
  }

  private _editRowTemplate(row: ProjectRow): TemplateResult {
    return html`
      <tr>
        <td class=${TD_CLASS}><input type="text" class=${classesFor('text-input')} .value=${this._editName} @input=${this._handleEditNameInput} @click=${(e: Event) => e.stopPropagation()} /></td>
        <td class=${TD_CLASS}>${row.moduleName}</td>
        <td class=${TD_CLASS}>${row.cycleName}</td>
        <td class=${TD_CLASS}>${row.legislationName ?? ''}</td>
        <td class=${TD_CLASS}>${row.startYear ?? ''}</td>
        <td class=${TD_CLASS}>
          <button class=${classesFor('button', 'secondary', 'sm')} data-action="save" ?disabled=${this._editLoading} @click=${(e: Event) => this._handleSaveEditClick(row.id, e)}>Guardar</button>
        </td>
        <td class=${TD_CLASS}></td>
      </tr>
    `;
  }
}
customElements.define('corrector-assignment-form', CorrectorAssignmentForm);
