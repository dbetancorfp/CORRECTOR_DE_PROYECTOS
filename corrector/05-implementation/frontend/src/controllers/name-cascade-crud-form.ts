import { html, render } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { HttpLegislationService } from '../services/legislation.service';
import type { Legislation, LegislationService } from '../services/legislation.service';
import { HttpCycleService } from '../services/cycle.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import { HttpModuleService } from '../services/module.service';
import type { Module, ModuleService } from '../services/module.service';
import { renderGestionNav, GESTION_TAB_PATHS } from '../components/gestion-nav';
import type { GestionTab } from '../components/gestion-nav';
import { renderOptionSelect } from '../components/option-select';
import { FormCascadeEngine } from './form-cascade-engine';
import type { CascadeErrors, CascadeSketchNumbers } from './form-cascade-engine';
import { runDeleteRowFlow } from './delete-row-flow';
import { runCreateRowFlow } from './create-row-flow';
import type { CreateResult } from './create-row-flow';
import { runEditRowFlow } from './edit-row-flow';
import type { EditResult } from './edit-row-flow';

const FILTER_DEBOUNCE_MS = 300;

export interface NameCascadeErrors extends CascadeErrors {
  name: boolean;
}

export interface NameCascadeItem {
  id: number;
  name: string;
}

// The table row adds two client-computed fields (from the cascade
// selection) on top of whatever `create()`/`update()` actually persist.
export type NameCascadeRow<Item extends NameCascadeItem> = Item & {
  legislationName: string | null;
  startYear: number | null;
};

export interface NameCascadeController<Item extends NameCascadeItem> {
  list(): Promise<NameCascadeRow<Item>[]>;
  loadYearOptions(): Promise<number[]>;
  create(name: string, year: string, legislation: string, cycle: string, module: string): Promise<CreateResult<Item, NameCascadeErrors>>;
  update(id: number, name: string): Promise<EditResult<Item>>;
  delete(id: number): Promise<{ status: string; message?: string }>;
  filterRows(name: string, year: string, legislation: string, cycle: string, module: string): Promise<NameCascadeRow<Item>[]>;
}

export interface NameCascadeSketchIds {
  name: number;
  submit: number;
  nameFilter: number;
  yearFilter: number;
  legislationFilter: number;
  cycleFilter: number;
  moduleFilter: number;
  table: number;
}

// Shared shape of every "name + año→legislación→ciclo→módulo cascade" CRUD
// screen (Alumnos, Proyectos — both a name field, a 4-level cascade with
// validation, and identical create/edit/delete/filter/table wiring). A
// screen extends this instead of HTMLElement directly and only supplies the
// genuinely different bits (labels, sketchNumbers, table columns, the
// concrete controller/service). See CLAUDE.md "Frontend: Web Components" —
// this is still exactly one custom element / one Shadow DOM per screen, the
// sharing is plain inheritance, not composition of nested elements.
export abstract class NameCascadeCrudForm<Item extends NameCascadeItem> extends HTMLElement {
  legislationService?: LegislationService;
  cycleService?: CycleService;
  moduleService?: ModuleService;

  protected _controller!: NameCascadeController<Item>;
  protected _cascade!: FormCascadeEngine;
  protected _disposables: Array<() => void> = [];

  protected _rows: NameCascadeRow<Item>[] = [];

  protected _name = '';
  protected _nameError = false;
  protected _formLoading = false;
  protected _formErrorMessage = '';

  protected _nameFilter = '';
  protected _yearFilter = '';
  protected _legislationFilter = '';
  protected _cycleFilter = '';
  protected _moduleFilter = '';
  protected _filterTimeout: ReturnType<typeof setTimeout> | null = null;

  protected _editingId: number | null = null;
  protected _editName = '';
  protected _editLoading = false;
  protected _editErrorMessage = '';

  protected _rowErrorMessage = '';

  protected abstract _gestionTab(): GestionTab;
  protected abstract _cascadeSketchNumbers(): CascadeSketchNumbers;
  protected abstract _sketchIds(): NameCascadeSketchIds;
  protected abstract _createLegend(): string;
  protected abstract _namePlaceholder(): string;
  protected abstract _nameFilterPlaceholder(): string;
  protected abstract _emptyMessage(): string;
  protected abstract _deleteConfirmMessage(row: NameCascadeRow<Item>): string;
  protected abstract _buildController(
    legislationService: LegislationService,
    cycleService: CycleService,
    moduleService: ModuleService,
  ): NameCascadeController<Item>;
  protected abstract _rowTemplate(row: NameCascadeRow<Item>): TemplateResult;
  protected abstract _editRowTemplate(row: NameCascadeRow<Item>): TemplateResult;

  protected _renderCreateExtra(): TemplateResult {
    return html``;
  }

  protected _renderBelowForm(): TemplateResult {
    return html``;
  }

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    const legislationService = this.legislationService ?? new HttpLegislationService();
    const cycleService = this.cycleService ?? new HttpCycleService();
    const moduleService = this.moduleService ?? new HttpModuleService();
    this._cascade = new FormCascadeEngine(
      legislationService, cycleService, moduleService,
      this._cascadeSketchNumbers(),
      () => this._render(),
    );
    this._controller = this._buildController(legislationService, cycleService, moduleService);
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

  protected async _loadInitial(): Promise<void> {
    const [rows] = await Promise.all([
      this._controller.list(),
      this._cascade.loadYearOptions(),
    ]);
    this._rows = rows;
    this._render();
  }

  protected _handleNameInput = (e: Event): void => {
    this._name = (e.target as HTMLInputElement).value;
    this._nameError = false;
    this._render();
  };

  protected _handleSubmitClick = (): void => {
    void this._submitCreate();
  };

  protected async _submitCreate(): Promise<void> {
    await runCreateRowFlow(
      (loading) => { this._formLoading = loading; },
      (message) => { this._formErrorMessage = message; },
      () => this._render(),
      () => this._controller.create(
        this._name.trim(),
        this._cascade.selectedYear,
        this._cascade.selectedLegislation,
        this._cascade.selectedCycle,
        this._cascade.selectedModule,
      ),
      (item) => {
        const selectedModuleObj = this._cascade.moduleOptions.find((m) => String(m.id) === this._cascade.selectedModule);
        const startYear = this._cascade.selectedYear === '' ? null : Number(this._cascade.selectedYear);
        this._rows = [...this._rows, { ...item, legislationName: selectedModuleObj?.legislationName ?? null, startYear }];
        this._name = '';
        this._nameError = false;
        this._cascade.reset();
      },
      (errors) => {
        this._nameError = errors.name;
        this._cascade.errors = { year: errors.year, legislation: errors.legislation, cycle: errors.cycle, module: errors.module };
      },
    );
  }

  protected _handleNameFilterInput = (e: Event): void => {
    this._nameFilter = (e.target as HTMLInputElement).value;
    this._scheduleFilter();
  };

  protected _handleYearFilterChange = (e: Event): void => {
    this._yearFilter = (e.target as HTMLSelectElement).value;
    this._scheduleFilter();
  };

  protected _handleLegislationFilterChange = (e: Event): void => {
    this._legislationFilter = (e.target as HTMLSelectElement).value;
    this._cycleFilter = '';
    this._moduleFilter = '';
    this._scheduleFilter();
  };

  protected _handleCycleFilterChange = (e: Event): void => {
    this._cycleFilter = (e.target as HTMLSelectElement).value;
    this._moduleFilter = '';
    this._scheduleFilter();
  };

  protected _handleModuleFilterChange = (e: Event): void => {
    this._moduleFilter = (e.target as HTMLSelectElement).value;
    this._scheduleFilter();
  };

  protected _scheduleFilter(): void {
    this._render();
    if (this._filterTimeout) clearTimeout(this._filterTimeout);
    this._filterTimeout = setTimeout(() => void this._applyFilters(), FILTER_DEBOUNCE_MS);
  }

  protected async _applyFilters(): Promise<void> {
    this._rows = await this._controller.filterRows(this._nameFilter, this._yearFilter, this._legislationFilter, this._cycleFilter, this._moduleFilter);
    this._render();
  }

  protected _startEdit = (row: NameCascadeRow<Item>): void => {
    this._editingId = row.id;
    this._editName = row.name;
    this._editErrorMessage = '';
    this._render();
  };

  protected _handleEditNameInput = (e: Event): void => {
    this._editName = (e.target as HTMLInputElement).value;
  };

  protected _handleSaveEditClick = (id: number): void => {
    void this._saveEdit(id);
  };

  protected async _saveEdit(id: number): Promise<void> {
    await runEditRowFlow(
      (loading) => { this._editLoading = loading; },
      () => this._render(),
      () => this._controller.update(id, this._editName.trim()),
      (item) => {
        this._rows = this._rows.map((row) => (row.id === id ? { ...row, name: item.name } : row));
        this._editingId = null;
      },
      (message) => { this._editErrorMessage = message; },
    );
  }

  protected _handleDeleteClick = (row: NameCascadeRow<Item>): void => {
    void this._handleDelete(row);
  };

  protected async _handleDelete(row: NameCascadeRow<Item>): Promise<void> {
    this._rowErrorMessage = '';
    await runDeleteRowFlow(
      this._deleteConfirmMessage(row),
      () => this._controller.delete(row.id),
      () => { this._rows = this._rows.filter((r) => r.id !== row.id); },
      (message) => { this._rowErrorMessage = message; },
    );
    this._render();
  }

  protected _handleLogoutClick = (): void => {
    this.dispatchEvent(new CustomEvent('corrector:logout', { bubbles: true, composed: true }));
  };

  protected _handleNavigateClick = (tab: GestionTab): void => {
    this.dispatchEvent(new CustomEvent('corrector:gestion-nav-selected', {
      bubbles: true,
      composed: true,
      detail: { to: GESTION_TAB_PATHS[tab] },
    }));
  };

  protected _render(): void {
    render(this._template(), this.shadowRoot!);
  }

  protected _template(): TemplateResult {
    const ids = this._sketchIds();
    return html`
      ${renderGestionNav(this._gestionTab(), this._handleLogoutClick, this._handleNavigateClick)}

      <div role="alert">${this._formErrorMessage}</div>
      <form>
        <fieldset>
          <legend>${this._createLegend()}</legend>
          <input
            data-element-id=${ids.name}
            type="text"
            placeholder=${this._namePlaceholder()}
            .value=${this._name}
            aria-invalid=${this._nameError ? 'true' : 'false'}
            @input=${this._handleNameInput}
          />
          ${this._cascade.render()}
          <div>
            <button
              data-element-id=${ids.submit}
              type="button"
              ?disabled=${this._formLoading}
              @click=${this._handleSubmitClick}
            >
              Nuevo
            </button>
            ${this._renderCreateExtra()}
          </div>
        </fieldset>
      </form>
      ${this._renderBelowForm()}

      <fieldset>
        <legend>Filtrar por:</legend>
        <input
          data-element-id=${ids.nameFilter}
          type="text"
          placeholder=${this._nameFilterPlaceholder()}
          .value=${this._nameFilter}
          @input=${this._handleNameFilterInput}
        />
        ${renderOptionSelect({
          sketchNumber: ids.yearFilter, options: this._cascade.yearOptions, getId: (y) => y, getLabel: (y) => String(y),
          selectedValue: this._yearFilter, placeholder: 'Seleccionar año', onChange: this._handleYearFilterChange,
        })}
        ${renderOptionSelect({
          sketchNumber: ids.legislationFilter, options: this._cascade.legislationOptions, getId: (l: Legislation) => l.id, getLabel: (l: Legislation) => l.name,
          selectedValue: this._legislationFilter, placeholder: 'Seleccionar legislación', onChange: this._handleLegislationFilterChange,
        })}
        ${renderOptionSelect({
          sketchNumber: ids.cycleFilter, options: this._cascade.cycleOptions, getId: (c: Cycle) => c.id, getLabel: (c: Cycle) => c.name,
          selectedValue: this._cycleFilter, placeholder: 'Seleccionar ciclo',
          disabled: this._legislationFilter === '', onChange: this._handleCycleFilterChange,
        })}
        ${renderOptionSelect({
          sketchNumber: ids.moduleFilter, options: this._cascade.moduleOptions, getId: (m: Module) => m.id, getLabel: (m: Module) => m.name,
          selectedValue: this._moduleFilter, placeholder: 'Seleccionar módulo',
          disabled: this._cycleFilter === '', onChange: this._handleModuleFilterChange,
        })}
      </fieldset>

      <div role="alert">${this._rowErrorMessage}</div>
      <table data-element-id=${ids.table}>
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
      ${this._rows.length === 0 ? html`<p>${this._emptyMessage()}</p>` : ''}
    `;
  }
}
