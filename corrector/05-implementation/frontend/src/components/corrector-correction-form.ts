import { html, render } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { HttpCorrectionService } from '../services/correction.service';
import type { CorrectionService } from '../services/correction.service';
import { HttpProjectService } from '../services/project.service';
import type { ProjectService, Project } from '../services/project.service';
import { HttpProjectStudentService } from '../services/project-student.service';
import type { ProjectStudentService, AssignedStudent } from '../services/project-student.service';
import { HttpRubricService } from '../services/rubric.service';
import type { RubricService, RubricItem } from '../services/rubric.service';
import { HttpLegislationService } from '../services/legislation.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import { HttpCycleService } from '../services/cycle.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import { HttpModuleService } from '../services/module.service';
import type { Module, ModuleService } from '../services/module.service';
import { CorrectionController } from '../controllers/correction-controller';

const LEVEL_ORDER = ['Excelente', 'Muy bien', 'Bien', 'Regular', 'Mal'];

// corrector-correction-form
// sketchNumbers: 101-104 (año/legislación/ciclo/módulo — navegación para
// filtrar #105), 105 (proyecto — dispara la carga real de rúbrica +
// alumnos), 106 (Corregir por grupo), 107-109 (checkboxes de alumno,
// renderizados solo hasta project.studentCount, máx 3), 110 (tabla de
// corrección), 112 (nota bruta), 113 (nota sobre 10).
//
// #111 no se renderiza como tabla separada: functional-spec.json lo dice
// explícitamente ("Boceto shows two correction sub-tables to represent that
// items can have different level counts; in implementation, one correction
// table renders dynamically with variable columns") — #110 es esa tabla
// única, con columnas para las 5 posibles pero cada fila solo activa las
// que su ítem define (mismo patrón ya usado en #100 de Rúbrica).
export class CorrectorCorrectionForm extends HTMLElement {
  correctionService?: CorrectionService;
  projectService?: ProjectService;
  projectStudentService?: ProjectStudentService;
  rubricService?: RubricService;
  legislationService?: LegislationService;
  cycleService?: CycleService;
  moduleService?: ModuleService;

  private _controller!: CorrectionController;
  private _disposables: Array<() => void> = [];

  private _selectedYear = '';
  private _selectedLegislation = '';
  private _selectedCycle = '';
  private _selectedModule = '';
  private _yearOptions: number[] = [];
  private _legislationOptions: Legislation[] = [];
  private _cycleOptions: Cycle[] = [];
  private _moduleOptions: Module[] = [];

  private _projects: Project[] = [];
  private _selectedProjectId = '';
  private _currentProject: Project | null = null;

  private _rubric: { rubricId: number; items: RubricItem[] } | null = null;
  private _noRubricWarning = false;

  private _assignedStudents: AssignedStudent[] = [];
  private _groupMode = false;
  private _checkedStudentIds: Set<number> = new Set();

  private _selections: Map<number, number> = new Map();
  private _saveErrorMessage = '';
  private _saving = false;

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._controller = new CorrectionController(
      this.correctionService ?? new HttpCorrectionService(),
      this.projectService ?? new HttpProjectService(),
      this.projectStudentService ?? new HttpProjectStudentService(),
      this.rubricService ?? new HttpRubricService(),
      this.legislationService ?? new HttpLegislationService(),
      this.cycleService ?? new HttpCycleService(),
      this.moduleService ?? new HttpModuleService(),
    );
    this._render();
    void this._loadInitial();
  }

  disconnectedCallback(): void {
    this._disposables.forEach((dispose) => dispose());
    this._disposables = [];
  }

  private async _loadInitial(): Promise<void> {
    this._yearOptions = await this._controller.loadYearOptions();
    this._render();
  }

  private _resetFromModule(): void {
    this._projects = [];
    this._selectedProjectId = '';
    this._resetFromProject();
  }

  private _resetFromProject(): void {
    this._currentProject = null;
    this._rubric = null;
    this._noRubricWarning = false;
    this._assignedStudents = [];
    this._groupMode = false;
    this._checkedStudentIds = new Set();
    this._selections = new Map();
    this._saveErrorMessage = '';
  }

  private _handleYearChange = (e: Event): void => {
    this._selectedYear = (e.target as HTMLSelectElement).value;
    this._selectedLegislation = '';
    this._selectedCycle = '';
    this._selectedModule = '';
    this._legislationOptions = [];
    this._cycleOptions = [];
    this._moduleOptions = [];
    this._resetFromModule();
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
    this._resetFromModule();
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
    this._resetFromModule();
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
    this._resetFromModule();
    this._render();
    void this._loadProjects();
  };

  private async _loadProjects(): Promise<void> {
    const moduleId = this._selectedModule === '' ? null : Number(this._selectedModule);
    this._projects = await this._controller.loadProjects(moduleId);
    this._render();
  }

  private _handleProjectChange = (e: Event): void => {
    this._selectedProjectId = (e.target as HTMLSelectElement).value;
    this._resetFromProject();
    this._render();
    void this._loadProject();
  };

  // Rubric existence and its academic_year depend on the PROJECT actually
  // selected (project.academicYear), not on the #101 year picked for
  // navigating the cascade — #105 isn't filtered by year, a module's
  // projects can span several academic years (see project-controller.ts).
  private async _loadProject(): Promise<void> {
    if (this._selectedProjectId === '') return;
    const project = this._projects.find((p) => String(p.id) === this._selectedProjectId);
    if (!project) return;
    this._currentProject = project;
    this._render();

    const [rubric, assignedStudents] = await Promise.all([
      this._controller.loadRubric(project.moduleId, project.academicYear),
      this._controller.loadAssignedStudents(project.id),
    ]);
    if (!rubric) {
      this._noRubricWarning = true;
      this._render();
      return;
    }
    this._rubric = rubric;
    this._assignedStudents = assignedStudents;
    this._render();
  }

  private _handleGroupToggle = (e: Event): void => {
    this._groupMode = (e.target as HTMLInputElement).checked;
    this._checkedStudentIds = new Set();
    this._render();
  };

  private _handleStudentToggle = (studentId: number, e: Event): void => {
    const checked = (e.target as HTMLInputElement).checked;
    const next = new Set(this._checkedStudentIds);
    if (checked) next.add(studentId); else next.delete(studentId);
    this._checkedStudentIds = next;
    this._render();

    if (checked && next.size === 1 && this._currentProject) {
      void this._preloadExisting(studentId, this._currentProject.id);
    }
  };

  private async _preloadExisting(studentId: number, projectId: number): Promise<void> {
    const existing = await this._controller.loadExistingCorrection(studentId, projectId);
    if (!existing) return;
    this._selections = new Map(existing.items.map((i) => [i.rubricItemId, i.rubricLevelId]));
    this._render();
  }

  private _handleCellClick = (itemId: number, levelId: number): void => {
    this._selections = new Map(this._selections).set(itemId, levelId);
    this._render();
    void this._maybeAutoSave();
  };

  private async _maybeAutoSave(): Promise<void> {
    if (!this._rubric || !this._currentProject) return;
    if (this._selections.size < this._rubric.items.length) return;

    const targetStudentIds = this._groupMode
      ? this._assignedStudents.map((s) => s.studentId)
      : Array.from(this._checkedStudentIds);
    if (targetStudentIds.length === 0) return;

    this._saving = true;
    this._saveErrorMessage = '';
    this._render();

    const state = await this._controller.saveForStudents(
      targetStudentIds,
      this._currentProject.id,
      this._currentProject.moduleId,
      this._rubric.rubricId,
      this._currentProject.academicYear,
      this._selections,
    );
    this._saving = false;

    if (state.status !== 'success') {
      this._saveErrorMessage = state.message;
    }
    this._render();
  }

  private _handleLogoutClick = (): void => {
    this.dispatchEvent(new CustomEvent('corrector:logout', { bubbles: true, composed: true }));
  };

  private _render(): void {
    render(this._template(), this.shadowRoot!);
  }

  private _rawScore(): number {
    return this._rubric ? this._controller.rawScore(this._selections, this._rubric.items) : 0;
  }

  private _normalisedScore(): number {
    if (!this._rubric) return 0;
    const max = this._controller.maxScore(this._rubric.items);
    return this._controller.normalisedScore(this._rawScore(), max);
  }

  private _template(): TemplateResult {
    return html`
      <nav>
        <span>Corrector de proyectos</span>
        <button data-action="logout" @click=${this._handleLogoutClick}>Salir</button>
      </nav>
      <h2>Corregir proyecto</h2>

      <fieldset>
        <legend>Filtrar por módulo:</legend>
        <select data-element-id="101" @change=${this._handleYearChange}>
          <option value="">Seleccionar año</option>
          ${this._yearOptions.map((year) => html`<option value=${year} ?selected=${String(year) === this._selectedYear}>${year}</option>`)}
        </select>
        <select data-element-id="102" ?disabled=${this._selectedYear === ''} @change=${this._handleLegislationChange}>
          <option value="">Seleccionar legislación</option>
          ${this._legislationOptions.map((leg) => html`<option value=${leg.id} ?selected=${String(leg.id) === this._selectedLegislation}>${leg.name}</option>`)}
        </select>
        <select data-element-id="103" ?disabled=${this._selectedLegislation === ''} @change=${this._handleCycleChange}>
          <option value="">Seleccionar ciclo</option>
          ${this._cycleOptions.map((cycle) => html`<option value=${cycle.id} ?selected=${String(cycle.id) === this._selectedCycle}>${cycle.name}</option>`)}
        </select>
        <select data-element-id="104" ?disabled=${this._selectedCycle === ''} @change=${this._handleModuleChange}>
          <option value="">Seleccionar módulo</option>
          ${this._moduleOptions.map((mod) => html`<option value=${mod.id} ?selected=${String(mod.id) === this._selectedModule}>${mod.name}</option>`)}
        </select>
        <select data-element-id="105" ?disabled=${this._selectedModule === ''} @change=${this._handleProjectChange}>
          <option value="">Seleccionar proyecto</option>
          ${this._projects.map((p) => html`<option value=${p.id} ?selected=${String(p.id) === this._selectedProjectId}>${p.name}</option>`)}
        </select>
      </fieldset>

      <div role="alert">${this._noRubricWarning ? 'Este módulo no tiene rúbrica definida. No se puede corregir.' : ''}</div>

      ${this._currentProject && !this._noRubricWarning ? html`
        <div class="checkbox-column">
          <label><input type="checkbox" data-element-id="106" .checked=${this._groupMode} @change=${this._handleGroupToggle} /> Corregir por grupo</label>
          ${this._assignedStudents.map((s, i) => html`
            <label>
              <input
                type="checkbox"
                data-element-id=${107 + i <= 109 ? String(107 + i) : ''}
                ?checked=${this._groupMode || this._checkedStudentIds.has(s.studentId)}
                ?disabled=${this._groupMode}
                @change=${(e: Event) => this._handleStudentToggle(s.studentId, e)}
              />
              ${s.name}
            </label>
          `)}
        </div>

        <div role="alert">${this._saveErrorMessage}</div>
        ${this._rubric ? this._correctionTable(this._rubric.items) : ''}

        <div class="score-bar">
          <div class="score-line">
            <span>Puntuación obtenida en la rúbrica:</span>
            <strong data-element-id="112">${this._selections.size > 0 ? this._rawScore() : '—'}</strong>
          </div>
          <div class="score-line">
            <span>Puntuación obtenida sobre 10:</span>
            <strong data-element-id="113">${this._selections.size > 0 ? this._normalisedScore() : '—'}</strong>
          </div>
        </div>
      ` : ''}
    `;
  }

  private _correctionTable(items: RubricItem[]): TemplateResult {
    return html`
      <table style="border: 1px solid black; border-collapse: collapse;" data-element-id="110">
        <tr>
          <th style="width: 350px;">Item</th>
          ${LEVEL_ORDER.map((name) => html`<th>${name}</th>`)}
        </tr>
        ${items.map((item) => html`
          <tr>
            <td>${item.description}</td>
            ${LEVEL_ORDER.map((name) => {
              const level = item.levels.find((l) => l.name === name);
              if (!level) return html`<td></td>`;
              const selected = this._selections.get(item.id) === level.id;
              return html`
                <td
                  style=${selected ? 'background-color: lightgray; cursor: pointer;' : 'cursor: pointer;'}
                  @click=${() => this._handleCellClick(item.id, level.id)}
                >
                  ${level.score}
                </td>
              `;
            })}
          </tr>
        `)}
      </table>
    `;
  }
}
customElements.define('corrector-correction-form', CorrectorCorrectionForm);
