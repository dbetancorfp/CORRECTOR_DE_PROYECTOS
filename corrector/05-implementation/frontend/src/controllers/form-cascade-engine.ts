import type { Legislation, LegislationService } from '../services/legislation.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import type { Module, ModuleService } from '../services/module.service';
import { html } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { renderOptionSelect } from '../components/option-select';
import * as cascade from './academic-cascade';

export interface CascadeSketchNumbers {
  year: number;
  legislation: number;
  cycle: number;
  module: number;
}

export interface CascadeErrors {
  year: boolean;
  legislation: boolean;
  cycle: boolean;
  module: boolean;
}

// A single reusable año→legislación→ciclo→módulo cascade — owns its own
// state, reset-on-change wiring, and rendering. Used identically (one shared
// instance per screen, not one call site per screen) by every screen with
// this exact 4-level, validated-form shape (Alumnos, Proyectos,
// Profesorado) — screens with a genuinely different shape (Ciclos: 2
// levels; Módulos: reordered; Rúbrica/Corregir/Asignación: no validation
// errors) keep their own wiring rather than being forced into this one.
export class FormCascadeEngine {
  selectedYear = '';
  selectedLegislation = '';
  selectedCycle = '';
  selectedModule = '';
  yearOptions: number[] = [];
  legislationOptions: Legislation[] = [];
  cycleOptions: Cycle[] = [];
  moduleOptions: Module[] = [];
  errors: CascadeErrors = { year: false, legislation: false, cycle: false, module: false };

  constructor(
    private readonly legislationService: LegislationService,
    private readonly cycleService: CycleService,
    private readonly moduleService: ModuleService,
    private readonly sketchNumbers: CascadeSketchNumbers,
    private readonly notify: () => void,
  ) {}

  async loadYearOptions(): Promise<void> {
    this.yearOptions = await cascade.loadYearOptions(this.legislationService);
  }

  reset(): void {
    this.selectedYear = '';
    this.selectedLegislation = '';
    this.selectedCycle = '';
    this.selectedModule = '';
    this.legislationOptions = [];
    this.cycleOptions = [];
    this.moduleOptions = [];
    this.errors = { year: false, legislation: false, cycle: false, module: false };
  }

  handleYearChange = (e: Event): void => {
    this.selectedYear = (e.target as HTMLSelectElement).value;
    this.selectedLegislation = '';
    this.selectedCycle = '';
    this.selectedModule = '';
    this.legislationOptions = [];
    this.cycleOptions = [];
    this.moduleOptions = [];
    this.errors.year = false;
    this.notify();
    void this._loadLegislationOptions();
  };

  private async _loadLegislationOptions(): Promise<void> {
    const year = this.selectedYear === '' ? null : Number(this.selectedYear);
    this.legislationOptions = await cascade.loadLegislationOptions(this.legislationService, year);
    this.notify();
  }

  handleLegislationChange = (e: Event): void => {
    this.selectedLegislation = (e.target as HTMLSelectElement).value;
    this.selectedCycle = '';
    this.selectedModule = '';
    this.cycleOptions = [];
    this.moduleOptions = [];
    this.errors.legislation = false;
    this.notify();
    void this._loadCycleOptions();
  };

  private async _loadCycleOptions(): Promise<void> {
    const legislationId = this.selectedLegislation === '' ? null : Number(this.selectedLegislation);
    this.cycleOptions = await cascade.loadCycleOptions(this.cycleService, legislationId);
    this.notify();
  }

  handleCycleChange = (e: Event): void => {
    this.selectedCycle = (e.target as HTMLSelectElement).value;
    this.selectedModule = '';
    this.moduleOptions = [];
    this.errors.cycle = false;
    this.notify();
    void this._loadModuleOptions();
  };

  private async _loadModuleOptions(): Promise<void> {
    const cycleId = this.selectedCycle === '' ? null : Number(this.selectedCycle);
    this.moduleOptions = await cascade.loadModuleOptions(this.moduleService, cycleId);
    this.notify();
  }

  handleModuleChange = (e: Event): void => {
    this.selectedModule = (e.target as HTMLSelectElement).value;
    this.errors.module = false;
    this.notify();
  };

  render(): TemplateResult {
    return html`
      ${renderOptionSelect({
        sketchNumber: this.sketchNumbers.year,
        options: this.yearOptions,
        getId: (y: number) => y,
        getLabel: (y: number) => String(y),
        selectedValue: this.selectedYear,
        placeholder: 'Seleccionar año',
        invalid: this.errors.year,
        onChange: this.handleYearChange,
      })}
      ${renderOptionSelect({
        sketchNumber: this.sketchNumbers.legislation,
        options: this.legislationOptions,
        getId: (l: Legislation) => l.id,
        getLabel: (l: Legislation) => l.name,
        selectedValue: this.selectedLegislation,
        placeholder: 'Seleccionar legislación',
        disabled: this.selectedYear === '',
        invalid: this.errors.legislation,
        onChange: this.handleLegislationChange,
      })}
      ${renderOptionSelect({
        sketchNumber: this.sketchNumbers.cycle,
        options: this.cycleOptions,
        getId: (c: Cycle) => c.id,
        getLabel: (c: Cycle) => c.name,
        selectedValue: this.selectedCycle,
        placeholder: 'Seleccionar ciclo',
        disabled: this.selectedYear === '' || this.selectedLegislation === '',
        invalid: this.errors.cycle,
        onChange: this.handleCycleChange,
      })}
      ${renderOptionSelect({
        sketchNumber: this.sketchNumbers.module,
        options: this.moduleOptions,
        getId: (m: Module) => m.id,
        getLabel: (m: Module) => m.name,
        selectedValue: this.selectedModule,
        placeholder: 'Seleccionar módulo',
        disabled: this.selectedCycle === '',
        invalid: this.errors.module,
        onChange: this.handleModuleChange,
      })}
    `;
  }
}
