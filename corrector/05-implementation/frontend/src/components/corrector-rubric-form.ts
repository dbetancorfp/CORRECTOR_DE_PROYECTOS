import { html, render } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { HttpRubricService } from '../services/rubric.service';
import type { RubricService, RubricItem } from '../services/rubric.service';
import { HttpLegislationService } from '../services/legislation.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import { HttpCycleService } from '../services/cycle.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import { HttpModuleService } from '../services/module.service';
import type { Module, ModuleService } from '../services/module.service';
import { RubricController, DEFAULT_LEVEL_NAMES, MAX_LEVEL_COUNT, nextBuilderLevels } from '../controllers/rubric-controller';
import type { BuilderLevel } from '../controllers/rubric-controller';
import { renderGestionNav, GESTION_TAB_PATHS } from './gestion-nav';
import type { GestionTab } from './gestion-nav';
import { makeNavClickHandlers } from '../controllers/nav-click-handlers';
import { renderOptionSelect } from './option-select';
import { runDeleteRowFlow } from '../controllers/delete-row-flow';
import { attachSharedStyles } from '../styles/shadow-styles';
import { classesFor } from '../styles/classes-for';

const FILTER_DEBOUNCE_MS = 300;
const TD_CLASS = classesFor('table-editable-cell');

// corrector-rubric-form
// sketchNumbers: 86 (filtro por nombre de módulo — narrows options in #90),
// 87 (año — navegación), 88 (legislación — navegación), 89 (ciclo —
// navegación), 90 (módulo — selecciona la rúbrica a cargar en #100), 91
// (Nuevo nivel — añade columna al builder #92, máx 5), 92 (tabla builder:
// un único ítem en construcción), 93 (nombre del ítem), 94 (valor
// Excelente), 95 (valor Bien), 96 (valor Mal — siempre 0, no editable), 97
// (borrar/limpiar fila del builder), 98 (Añadir item — guarda o actualiza),
// 99 (Subir rúbrica), 100 (tabla completa de la rúbrica del módulo
// seleccionado, con Editar/Borrar)
export class CorrectorRubricForm extends HTMLElement {
  rubricService?: RubricService;
  legislationService?: LegislationService;
  cycleService?: CycleService;
  moduleService?: ModuleService;

  private _controller!: RubricController;
  private _disposables: Array<() => void> = [];
  private _nav = makeNavClickHandlers<GestionTab>(this, 'corrector:gestion-nav-selected', GESTION_TAB_PATHS);

  private _moduleFilter = '';
  private _moduleFilterTimeout: ReturnType<typeof setTimeout> | null = null;

  private _selectedYear = '';
  private _selectedLegislation = '';
  private _selectedCycle = '';
  private _selectedModule = '';
  private _yearOptions: number[] = [];
  private _legislationOptions: Legislation[] = [];
  private _cycleOptions: Cycle[] = [];
  private _moduleOptions: Module[] = [];

  private _items: RubricItem[] = [];

  private _builderDescription = '';
  private _builderLevels: BuilderLevel[] = DEFAULT_LEVEL_NAMES.map((name) => ({ name, score: 0 }));
  private _builderErrorMessage = '';
  private _builderLoading = false;
  private _editingItemId: number | null = null;

  private _uploadLoading = false;
  private _uploadErrorMessage = '';

  private _rowErrorMessage = '';

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    attachSharedStyles(this.shadowRoot!);
    this._controller = new RubricController(
      this.rubricService ?? new HttpRubricService(),
      this.legislationService ?? new HttpLegislationService(),
      this.cycleService ?? new HttpCycleService(),
      this.moduleService ?? new HttpModuleService(),
    );
    this._render();
    void this._loadInitial();
    this._disposables.push(() => {
      if (this._moduleFilterTimeout) clearTimeout(this._moduleFilterTimeout);
    });
  }

  disconnectedCallback(): void {
    this._disposables.forEach((dispose) => dispose());
    this._disposables = [];
  }

  private async _loadInitial(): Promise<void> {
    this._yearOptions = await this._controller.loadYearOptions();
    this._render();
  }

  private get _academicYear(): string | null {
    if (this._selectedYear === '') return null;
    const year = Number(this._selectedYear);
    return `${year}-${year + 1}`;
  }

  // ── Module selection cascade (#86-90) ─────────────────────────────────

  private _handleModuleFilterInput = (e: Event): void => {
    this._moduleFilter = (e.target as HTMLInputElement).value;
    this._render();
    if (this._moduleFilterTimeout) clearTimeout(this._moduleFilterTimeout);
    this._moduleFilterTimeout = setTimeout(() => this._render(), FILTER_DEBOUNCE_MS);
  };

  private _handleYearChange = (e: Event): void => {
    this._selectedYear = (e.target as HTMLSelectElement).value;
    this._selectedLegislation = '';
    this._selectedCycle = '';
    this._selectedModule = '';
    this._legislationOptions = [];
    this._cycleOptions = [];
    this._moduleOptions = [];
    this._items = [];
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
    this._items = [];
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
    this._items = [];
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
    this._render();
    void this._loadRubric();
  };

  private async _loadRubric(): Promise<void> {
    const academicYear = this._academicYear;
    if (this._selectedModule === '' || academicYear === null) {
      this._items = [];
      this._render();
      return;
    }
    this._items = await this._controller.loadRubric(Number(this._selectedModule), academicYear);
    this._render();
  }

  private _visibleModuleOptions(): Module[] {
    const q = this._moduleFilter.trim().toLowerCase();
    if (q === '') return this._moduleOptions;
    return this._moduleOptions.filter((m) => m.name.toLowerCase().includes(q));
  }

  // ── Item builder (#91-98) ─────────────────────────────────────────────

  private _handleAddLevelClick = (): void => {
    this._builderLevels = nextBuilderLevels(this._builderLevels);
    this._render();
  };

  private _handleBuilderDescriptionInput = (e: Event): void => {
    this._builderDescription = (e.target as HTMLInputElement).value;
    this._render();
  };

  private _handleBuilderScoreInput = (levelName: string, e: Event): void => {
    const value = Number((e.target as HTMLInputElement).value);
    this._builderLevels = this._builderLevels.map((l) => (l.name === levelName ? { ...l, score: value } : l));
    this._render();
  };

  private _handleClearBuilderClick = (): void => {
    this._resetBuilder();
    this._render();
  };

  private _resetBuilder(): void {
    this._builderDescription = '';
    this._builderLevels = DEFAULT_LEVEL_NAMES.map((name) => ({ name, score: 0 }));
    this._builderErrorMessage = '';
    this._editingItemId = null;
  }

  private _handleSaveItemClick = (): void => {
    void this._submitItem();
  };

  private async _submitItem(): Promise<void> {
    const moduleId = this._selectedModule === '' ? null : Number(this._selectedModule);
    const academicYear = this._academicYear;
    if (moduleId === null || academicYear === null) return;

    this._builderLoading = true;
    this._builderErrorMessage = '';
    this._render();

    const state = this._editingItemId === null
      ? await this._controller.addItem(moduleId, academicYear, this._builderDescription, this._builderLevels, this._items.length)
      : await this._controller.updateItem(this._editingItemId, this._builderDescription, this._builderLevels);
    this._builderLoading = false;

    if (state.status === 'success') {
      this._items = this._editingItemId === null
        ? [...this._items, state.item]
        : this._items.map((item) => (item.id === state.item.id ? state.item : item));
      this._resetBuilder();
      this._render();
      return;
    }

    this._builderErrorMessage = state.message;
    this._render();
  }

  // ── Full rubric table (#100) ──────────────────────────────────────────

  private _handleEditRowClick = (item: RubricItem): void => {
    this._editingItemId = item.id;
    this._builderDescription = item.description;
    this._builderLevels = item.levels.map((l) => ({ name: l.name, score: l.score }));
    this._builderErrorMessage = '';
    this._render();
  };

  private _handleDeleteRowClick = (item: RubricItem): void => {
    void this._deleteRow(item);
  };

  private async _deleteRow(item: RubricItem): Promise<void> {
    this._rowErrorMessage = '';
    await runDeleteRowFlow(
      `¿Eliminar el ítem "${item.description}"?`,
      () => this._controller.deleteItem(item.id),
      () => { this._items = this._items.filter((i) => i.id !== item.id); },
      (message) => { this._rowErrorMessage = message; },
    );
    this._render();
  }

  // ── Upload (#99) ───────────────────────────────────────────────────────

  private _handleUploadChange = (e: Event): void => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    void this._submitUpload(file);
    input.value = '';
  };

  private async _submitUpload(file: File): Promise<void> {
    const moduleId = this._selectedModule === '' ? null : Number(this._selectedModule);
    const academicYear = this._academicYear;
    if (moduleId === null || academicYear === null) return;

    this._uploadLoading = true;
    this._uploadErrorMessage = '';
    this._render();

    let state = await this._controller.upload(moduleId, academicYear, file, false);
    if (state.status === 'requires-confirmation') {
      const confirmed = window.confirm(state.message);
      state = confirmed
        ? await this._controller.upload(moduleId, academicYear, file, true)
        : { status: 'error', message: '' };
    }
    this._uploadLoading = false;

    if (state.status === 'success') {
      await this._loadRubric();
      return;
    }

    this._uploadErrorMessage = state.message;
    this._render();
  }

  private _render(): void {
    render(this._template(), this.shadowRoot!);
  }

  private _template(): TemplateResult {
    const levelCell = (name: string, elementId?: string): TemplateResult => {
      const level = this._builderLevels.find((l) => l.name === name);
      if (!level) return html``;
      const readonly = name === 'Mal';
      return html`
        <td class=${TD_CLASS} data-element-id=${elementId ?? ''}>
          <input
            type="number"
            class=${classesFor('number-input')}
            .value=${String(level.score)}
            ?readonly=${readonly}
            ?disabled=${readonly}
            @input=${(e: Event) => this._handleBuilderScoreInput(name, e)}
          />
        </td>
      `;
    };
    const extraLevels = this._builderLevels.filter((l) => !['Excelente', 'Bien', 'Mal'].includes(l.name));

    return html`
      ${renderGestionNav('rubrica', this._nav.handleLogoutClick, this._nav.handleNavigateClick)}

      <div class="p-4">
        <fieldset class="border border-gray-200 rounded p-4 mb-4">
          <legend class="font-medium text-gray-900 px-1">Filtrar por módulo:</legend>
          <div class="flex flex-wrap items-end gap-3">
            <input data-element-id="86" type="text" class=${classesFor('reactive-filter')} placeholder="Filtrar por proyecto" .value=${this._moduleFilter} @input=${this._handleModuleFilterInput} />
            ${renderOptionSelect({
              sketchNumber: 87, options: this._yearOptions, getId: (y) => y, getLabel: (y) => String(y),
              selectedValue: this._selectedYear, placeholder: 'Seleccionar año', onChange: this._handleYearChange,
            })}
            ${renderOptionSelect({
              sketchNumber: 88, options: this._legislationOptions, getId: (l) => l.id, getLabel: (l) => l.name,
              selectedValue: this._selectedLegislation, placeholder: 'Seleccionar legislación',
              disabled: this._selectedYear === '', onChange: this._handleLegislationChange,
            })}
            ${renderOptionSelect({
              sketchNumber: 89, options: this._cycleOptions, getId: (c) => c.id, getLabel: (c) => c.name,
              selectedValue: this._selectedCycle, placeholder: 'Seleccionar ciclo',
              disabled: this._selectedLegislation === '', onChange: this._handleCycleChange,
            })}
            ${renderOptionSelect({
              sketchNumber: 90, options: this._visibleModuleOptions(), getId: (m) => m.id, getLabel: (m) => m.name,
              selectedValue: this._selectedModule, placeholder: 'Seleccionar módulo',
              disabled: this._selectedCycle === '', onChange: this._handleModuleChange,
            })}
          </div>
        </fieldset>

        <fieldset class="border border-gray-200 rounded p-4 mb-4">
          <legend class="font-medium text-gray-900 px-1">${this._editingItemId === null ? 'Nuevo item:' : 'Editar item:'}</legend>
          <div role="alert" class=${this._builderErrorMessage ? classesFor('paragraph', 'danger') : ''}>${this._builderErrorMessage}</div>
          <button type="button" class=${classesFor('button', 'secondary', 'sm') + ' mb-2'} data-element-id="91" ?disabled=${this._builderLevels.length >= MAX_LEVEL_COUNT} @click=${this._handleAddLevelClick}>Nuevo nivel</button>
          <table class=${classesFor('table')} data-element-id="92">
            <tr>
              <th class=${classesFor('table-header-cell')}>Item</th>
              ${this._builderLevels.map((l) => html`<th class=${classesFor('table-header-cell')}>${l.name}</th>`)}
              <th class=${classesFor('table-header-cell')}>Borrar</th>
            </tr>
            <tr>
              <td class=${TD_CLASS} data-element-id="93">
                <input type="text" class=${classesFor('text-input')} .value=${this._builderDescription} @input=${this._handleBuilderDescriptionInput} />
              </td>
              ${levelCell('Excelente', '94')}
              ${levelCell('Bien', '95')}
              ${extraLevels.map((l) => levelCell(l.name))}
              ${levelCell('Mal', '96')}
              <td class=${TD_CLASS}><button type="button" class=${classesFor('icon-button', 'danger')} data-element-id="97" @click=${this._handleClearBuilderClick}>Icono borrar</button></td>
            </tr>
          </table>
          <div class="flex items-center justify-between mt-3">
            <button type="button" class=${classesFor('submit-button', 'primary')} data-element-id="98" ?disabled=${this._builderLoading || this._selectedModule === ''} @click=${this._handleSaveItemClick}>Añadir item</button>
            <input data-element-id="99" type="file" class=${classesFor('file-upload')} accept=".csv,.json,.yaml,.yml" ?disabled=${this._uploadLoading || this._selectedModule === ''} @change=${this._handleUploadChange} />
          </div>
          <div role="alert" class=${this._uploadErrorMessage ? classesFor('paragraph', 'danger') : ''}>${this._uploadErrorMessage}</div>
        </fieldset>

        <div role="alert" class=${this._rowErrorMessage ? classesFor('paragraph', 'danger') : ''}>${this._rowErrorMessage}</div>
        <table class=${classesFor('table')} data-element-id="100">
          <tr>
            <th class=${classesFor('table-header-cell')}>Item</th>
            <th class=${classesFor('table-header-cell')}>Excelente</th>
            <th class=${classesFor('table-header-cell')}>Muy bien</th>
            <th class=${classesFor('table-header-cell')}>Bien</th>
            <th class=${classesFor('table-header-cell')}>Regular</th>
            <th class=${classesFor('table-header-cell')}>Mal</th>
            <th class=${classesFor('table-header-cell')}>Editar</th>
            <th class=${classesFor('table-header-cell')}>Borrar</th>
          </tr>
          ${this._items.map((item) => this._rowTemplate(item))}
        </table>
        ${this._items.length === 0 ? html`<p class=${classesFor('paragraph')}>No hay ítems en la rúbrica</p>` : ''}
      </div>
    `;
  }

  private _rowTemplate(item: RubricItem): TemplateResult {
    const scoreFor = (name: string): string => {
      const level = item.levels.find((l) => l.name === name);
      return level ? String(level.score) : '';
    };
    return html`
      <tr>
        <td class=${TD_CLASS}>${item.description}</td>
        <td class=${TD_CLASS}>${scoreFor('Excelente')}</td>
        <td class=${TD_CLASS}>${scoreFor('Muy bien')}</td>
        <td class=${TD_CLASS}>${scoreFor('Bien')}</td>
        <td class=${TD_CLASS}>${scoreFor('Regular')}</td>
        <td class=${TD_CLASS}>${scoreFor('Mal')}</td>
        <td class=${TD_CLASS}><button class=${classesFor('icon-button')} data-action="edit" @click=${() => this._handleEditRowClick(item)}>Icono editar</button></td>
        <td class=${TD_CLASS}><button class=${classesFor('icon-button', 'danger')} data-action="delete" @click=${() => this._handleDeleteRowClick(item)}>Icono borrar</button></td>
      </tr>
    `;
  }
}
customElements.define('corrector-rubric-form', CorrectorRubricForm);
