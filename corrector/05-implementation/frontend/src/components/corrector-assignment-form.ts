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
import { renderOptionSelect } from './option-select';

const FILTER_DEBOUNCE_MS = 300;

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
    this._editLoading = true;
    this._render();

    const state = await this._projectController.update(id, this._editName.trim());
    this._editLoading = false;

    if (state.status === 'success') {
      this._rows = this._rows.map((row) => (row.id === id ? { ...row, name: state.item.name } : row));
      if (id === this._selectedProjectId) this._selectedProjectName = state.item.name;
      this._editingId = null;
      this._render();
      return;
    }

    this._editErrorMessage = state.status === 'validation-error' ? 'Datos no válidos' : state.message;
    this._render();
  }

  private _handleDeleteClick = (row: ProjectRow, e: Event): void => {
    e.stopPropagation();
    void this._handleDelete(row);
  };

  private async _handleDelete(row: ProjectRow): Promise<void> {
    const confirmed = window.confirm(`¿Eliminar el proyecto ${row.name}?`);
    if (!confirmed) return;

    this._rowErrorMessage = '';
    const state = await this._projectController.delete(row.id);

    if (state.status === 'success') {
      this._rows = this._rows.filter((r) => r.id !== row.id);
      if (row.id === this._selectedProjectId) {
        this._selectedProjectId = null;
        this._selectedProjectName = null;
        this._assignedStudents = [];
        this._candidates = [];
      }
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
    const assignDisabled = this._selectedProjectId === null || this._selectedCandidateIds.size === 0 || this._assignLoading;
    return html`
      ${renderGestionNav('asignacion', this._handleLogoutClick, this._handleNavigateClick)}

      <div role="alert">${this._rowErrorMessage}</div>

      <div class="doscolfilter">
        <fieldset>
          <legend>Filtrar por proyecto:</legend>
          <input data-element-id="73" type="text" placeholder="Filtrar por proyecto" .value=${this._projectNameFilter} @input=${this._handleProjectNameFilterInput} />
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
        </fieldset>

        <fieldset>
          <legend>Filtrar por alumno:</legend>
          <input data-element-id="78" type="text" placeholder="Filtrar por nombre" .value=${this._studentNameFilter} @input=${this._handleStudentNameFilterInput} />
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
        </fieldset>
      </div>

      <div class="trescolfilter">
        <fieldset data-element-id="83">
          <legend>Proyecto:</legend>
          ${this._selectedProjectName ?? ''}
        </fieldset>

        <div role="alert">${this._assignErrorMessage}</div>
        <button data-element-id="121" type="button" ?disabled=${assignDisabled} @click=${this._handleAssignClick}>Agregar alumnos</button>

        <fieldset data-element-id="84">
          <legend>Alumnos:</legend>
          ${this._assignedStudents.map((s) => html`
            <div>
              ${s.name}
              <button data-action="unassign" @click=${() => this._handleUnassignClick(s.studentId)}>Quitar</button>
            </div>
          `)}
          ${this._candidates.map((s) => html`
            <label>
              <input type="checkbox" data-student=${s.id} .checked=${this._selectedCandidateIds.has(s.id)} @change=${(e: Event) => this._handleCandidateToggle(s.id, e)} />
              ${s.name}
            </label>
          `)}
        </fieldset>
      </div>

      <table data-element-id="85">
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
      ${this._rows.length === 0 ? html`<p>No hay proyectos registrados</p>` : ''}
    `;
  }

  private _rowTemplate(row: ProjectRow): TemplateResult {
    return html`
      <tr @click=${() => this._handleRowClick(row)}>
        <td>${row.name}</td>
        <td>${row.moduleName}</td>
        <td>${row.cycleName}</td>
        <td>${row.legislationName ?? ''}</td>
        <td>${row.startYear ?? ''}</td>
        <td><button data-action="edit" @click=${(e: Event) => this._startEdit(row, e)}>Icono editar</button></td>
        <td><button data-action="delete" @click=${(e: Event) => this._handleDeleteClick(row, e)}>Icono borrar</button></td>
      </tr>
    `;
  }

  private _editRowTemplate(row: ProjectRow): TemplateResult {
    return html`
      <tr>
        <td><input type="text" .value=${this._editName} @input=${this._handleEditNameInput} @click=${(e: Event) => e.stopPropagation()} /></td>
        <td>${row.moduleName}</td>
        <td>${row.cycleName}</td>
        <td>${row.legislationName ?? ''}</td>
        <td>${row.startYear ?? ''}</td>
        <td>
          <button data-action="save" ?disabled=${this._editLoading} @click=${(e: Event) => this._handleSaveEditClick(row.id, e)}>Guardar</button>
        </td>
        <td></td>
      </tr>
    `;
  }
}
customElements.define('corrector-assignment-form', CorrectorAssignmentForm);
