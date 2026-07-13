import { html, render } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { HttpGradeService } from '../services/grade.service';
import type { GradeService } from '../services/grade.service';
import { HttpAuthService } from '../services/auth.service';
import type { AuthService, TeacherRole } from '../services/auth.service';
import { HttpTeacherService } from '../services/teacher.service';
import type { TeacherService } from '../services/teacher.service';
import { HttpProjectService } from '../services/project.service';
import type { ProjectService, Project } from '../services/project.service';
import { HttpLegislationService } from '../services/legislation.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import { HttpCycleService } from '../services/cycle.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import { HttpModuleService } from '../services/module.service';
import type { Module, ModuleService } from '../services/module.service';
import { GradesViewController, moduleAbbreviation } from '../controllers/grades-view-controller';
import type { GradeTableData } from '../controllers/grades-view-controller';

// corrector-grades-view-form
// sketchNumbers: 114 (año — navegación), 115 (legislación), 116 (ciclo —
// dispara los badges #122), 117 (módulo — filtrado por rol: solo el propio
// para profesor, todos para tutor), 118 (proyecto — filtra la tabla #119 y,
// junto al resto, habilita #120), 119 (tabla de notas, columnas según rol),
// 120 (Imprimir — descarga el PDF), 122 (badges de estado de corrección).
//
// Misma pantalla para profesor y tutor (route /profesor/notas): el rol
// determina qué módulos aparecen en #117 y qué columnas tiene #119, per
// functional-spec.json — no hay una pantalla separada de "panorámica".
export class CorrectorGradesViewForm extends HTMLElement {
  gradeService?: GradeService;
  authService?: AuthService;
  teacherService?: TeacherService;
  projectService?: ProjectService;
  legislationService?: LegislationService;
  cycleService?: CycleService;
  moduleService?: ModuleService;

  private _controller!: GradesViewController;
  private _disposables: Array<() => void> = [];

  private _role: TeacherRole | null = null;
  private _teacherId = 0;

  private _selectedYear = '';
  private _selectedLegislation = '';
  private _selectedCycle = '';
  private _selectedModule = '';
  private _selectedProjectId = '';
  private _yearOptions: number[] = [];
  private _legislationOptions: Legislation[] = [];
  private _cycleOptions: Cycle[] = [];
  private _moduleOptions: Module[] = [];
  private _projects: Project[] = [];

  private _statusBadges: Array<{ moduleName: string; status: 'complete' | 'incomplete' }> = [];
  private _tableData: GradeTableData | null = null;

  private _printLoading = false;
  private _printErrorMessage = '';

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._controller = new GradesViewController(
      this.gradeService ?? new HttpGradeService(),
      this.authService ?? new HttpAuthService(),
      this.teacherService ?? new HttpTeacherService(),
      this.legislationService ?? new HttpLegislationService(),
      this.cycleService ?? new HttpCycleService(),
      this.moduleService ?? new HttpModuleService(),
    );
    this.projectService ??= new HttpProjectService();
    this._render();
    void this._loadInitial();
  }

  disconnectedCallback(): void {
    this._disposables.forEach((dispose) => dispose());
    this._disposables = [];
  }

  private async _loadInitial(): Promise<void> {
    const [roleInfo, yearOptions] = await Promise.all([
      this._controller.loadRole(),
      this._controller.loadYearOptions(),
    ]);
    if (roleInfo) {
      this._role = roleInfo.role;
      this._teacherId = roleInfo.teacherId;
    }
    this._yearOptions = yearOptions;
    this._render();
  }

  private get _academicYear(): string | null {
    if (this._selectedYear === '') return null;
    const year = Number(this._selectedYear);
    return `${year}-${year + 1}`;
  }

  private _resetFromCycle(): void {
    this._selectedModule = '';
    this._moduleOptions = [];
    this._statusBadges = [];
    this._resetFromModule();
  }

  private _resetFromModule(): void {
    this._selectedProjectId = '';
    this._projects = [];
    this._tableData = null;
    this._printErrorMessage = '';
  }

  private _handleYearChange = (e: Event): void => {
    this._selectedYear = (e.target as HTMLSelectElement).value;
    this._selectedLegislation = '';
    this._selectedCycle = '';
    this._legislationOptions = [];
    this._cycleOptions = [];
    this._resetFromCycle();
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
    this._cycleOptions = [];
    this._resetFromCycle();
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
    this._resetFromCycle();
    this._render();
    void this._loadModuleOptionsAndStatus();
  };

  private async _loadModuleOptionsAndStatus(): Promise<void> {
    if (this._selectedCycle === '' || this._role === null) return;
    const cycleId = Number(this._selectedCycle);
    const academicYear = this._academicYear;
    const [moduleOptions, statusEntries] = await Promise.all([
      this._controller.loadModuleOptions(cycleId, this._role, this._teacherId),
      academicYear ? this._controller.loadCorrectionStatus(cycleId, academicYear) : Promise.resolve([]),
    ]);
    this._moduleOptions = moduleOptions;
    this._statusBadges = statusEntries.map((s) => ({ moduleName: s.moduleName, status: s.status }));
    this._render();
  }

  private _handleModuleChange = (e: Event): void => {
    this._selectedModule = (e.target as HTMLSelectElement).value;
    this._resetFromModule();
    this._render();
    void this._loadProjectsAndTable();
  };

  private async _loadProjectsAndTable(): Promise<void> {
    if (this._selectedModule === '' || this._role === null) return;
    const moduleId = Number(this._selectedModule);
    const academicYear = this._academicYear;
    if (!academicYear) return;

    const [projectsResult, tableData] = await Promise.all([
      this.projectService!.list({ moduleId }),
      this._controller.loadTable(this._role, moduleId, Number(this._selectedCycle), academicYear),
    ]);
    this._projects = projectsResult.ok ? projectsResult.items : [];
    this._tableData = tableData;
    this._render();
  }

  private _handleProjectChange = (e: Event): void => {
    this._selectedProjectId = (e.target as HTMLSelectElement).value;
    this._render();
  };

  private _canPrint(): boolean {
    return this._selectedYear !== '' && this._selectedLegislation !== '' && this._selectedCycle !== ''
      && this._selectedModule !== '' && this._selectedProjectId !== '';
  }

  private _handlePrintClick = (): void => {
    void this._submitPrint();
  };

  private async _submitPrint(): Promise<void> {
    const academicYear = this._academicYear;
    if (!this._canPrint() || !academicYear) return;

    this._printLoading = true;
    this._printErrorMessage = '';
    this._render();

    const ok = await this._controller.downloadPdf(Number(this._selectedProjectId), academicYear);
    this._printLoading = false;
    if (!ok) this._printErrorMessage = 'No se pudo generar el PDF';
    this._render();
  }

  private _handleLogoutClick = (): void => {
    this.dispatchEvent(new CustomEvent('corrector:logout', { bubbles: true, composed: true }));
  };

  private _render(): void {
    render(this._template(), this.shadowRoot!);
  }

  private _visibleRows(): GradeTableData | null {
    if (!this._tableData || this._selectedProjectId === '') return this._tableData;
    const projectName = this._projects.find((p) => String(p.id) === this._selectedProjectId)?.name;
    if (!projectName) return this._tableData;
    if (this._tableData.role === 'profesor') {
      return { role: 'profesor', rows: this._tableData.rows.filter((r) => r.projectName === projectName) };
    }
    return { ...this._tableData, rows: this._tableData.rows.filter((r) => r.projectName === projectName) };
  }

  private _template(): TemplateResult {
    return html`
      <nav>
        <span>Corrector de proyectos</span>
        <button data-action="logout" @click=${this._handleLogoutClick}>Salir</button>
      </nav>
      <h2>Ver notas</h2>

      <fieldset>
        <legend>Filtrar por:</legend>
        <select data-element-id="114" @change=${this._handleYearChange}>
          <option value="">Seleccionar año</option>
          ${this._yearOptions.map((year) => html`<option value=${year} ?selected=${String(year) === this._selectedYear}>${year}</option>`)}
        </select>
        <select data-element-id="115" ?disabled=${this._selectedYear === ''} @change=${this._handleLegislationChange}>
          <option value="">Seleccionar legislación</option>
          ${this._legislationOptions.map((leg) => html`<option value=${leg.id} ?selected=${String(leg.id) === this._selectedLegislation}>${leg.name}</option>`)}
        </select>
        <select data-element-id="116" ?disabled=${this._selectedLegislation === ''} @change=${this._handleCycleChange}>
          <option value="">Seleccionar ciclo</option>
          ${this._cycleOptions.map((cycle) => html`<option value=${cycle.id} ?selected=${String(cycle.id) === this._selectedCycle}>${cycle.name}</option>`)}
        </select>
        <select data-element-id="117" ?disabled=${this._selectedCycle === ''} @change=${this._handleModuleChange}>
          <option value="">Seleccionar módulo</option>
          ${this._moduleOptions.map((mod) => html`<option value=${mod.id} ?selected=${String(mod.id) === this._selectedModule}>${mod.name}</option>`)}
        </select>
        <select data-element-id="118" ?disabled=${this._selectedModule === ''} @change=${this._handleProjectChange}>
          <option value="">Seleccionar proyecto</option>
          ${this._projects.map((p) => html`<option value=${p.id} ?selected=${String(p.id) === this._selectedProjectId}>${p.name}</option>`)}
        </select>
      </fieldset>

      <div data-element-id="122">
        ${this._statusBadges.map((b) => html`
          <span data-status=${b.status} style=${b.status === 'complete' ? 'background:green;color:white;' : 'background:red;color:white;'}>
            ${moduleAbbreviation(b.moduleName)}
          </span>
        `)}
      </div>

      ${this._renderTable()}

      <div role="alert">${this._printErrorMessage}</div>
      <button type="button" data-element-id="120" ?disabled=${!this._canPrint() || this._printLoading} @click=${this._handlePrintClick}>Imprimir</button>
    `;
  }

  private _renderTable(): TemplateResult {
    const data = this._visibleRows();
    if (!data) return html`<table data-element-id="119"></table>`;

    if (data.role === 'profesor') {
      return html`
        <table style="border: 1px solid black;" data-element-id="119">
          <tr><th>Proyecto</th><th>Nombre alumno</th><th>Nota</th></tr>
          ${data.rows.map((r) => html`<tr><td>${r.projectName}</td><td data-col="studentName">${r.studentName}</td><td>${r.moduleScore}</td></tr>`)}
        </table>
      `;
    }

    return html`
      <table style="border: 1px solid black;" data-element-id="119">
        <tr>
          <th>Proyecto</th><th>Nombre alumno</th>
          ${data.modules.map((m) => html`<th>${m.name}</th>`)}
          <th>Nota final</th>
        </tr>
        ${data.rows.map((r) => html`
          <tr>
            <td>${r.projectName}</td><td data-col="studentName">${r.studentName}</td>
            ${data.modules.map((m) => html`<td>${r.moduleScores[String(m.id)] ?? ''}</td>`)}
            <td>${r.finalScore}</td>
          </tr>
        `)}
      </table>
    `;
  }
}
customElements.define('corrector-grades-view-form', CorrectorGradesViewForm);
