import { html } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { HttpProjectService } from '../services/project.service';
import type { Project, ProjectService } from '../services/project.service';
import type { LegislationService } from '../services/legislation.service';
import type { CycleService } from '../services/cycle.service';
import type { ModuleService } from '../services/module.service';
import { ProjectController } from '../controllers/project-controller';
import type { ProjectRow } from '../controllers/project-controller';
import type { GestionTab } from './gestion-nav';
import { NameCascadeCrudForm } from '../controllers/name-cascade-crud-form';
import type { NameCascadeController, NameCascadeSketchIds } from '../controllers/name-cascade-crud-form';
import type { CascadeSketchNumbers } from '../controllers/form-cascade-engine';
import { classesFor } from '../styles/classes-for';

const TD_CLASS = classesFor('table-editable-cell');

// corrector-projects-form
// sketchNumbers: 61 (nombre), 62 (año — navegación, convertido a
// academic_year en la creación), 63 (legislación — navegación), 64 (ciclo —
// navegación, project no tiene cycle_id propio), 65 (módulo — FK real
// project.module_id), 66 (Nuevo), 67 (filtro nombre), 68 (filtro año), 69
// (filtro legislación), 70 (filtro ciclo), 71 (filtro módulo), 72 (tabla)
export class CorrectorProjectsForm extends NameCascadeCrudForm<Project> {
  projectService?: ProjectService;

  protected _gestionTab(): GestionTab {
    return 'proyectos';
  }

  protected _cascadeSketchNumbers(): CascadeSketchNumbers {
    return { year: 62, legislation: 63, cycle: 64, module: 65 };
  }

  protected _sketchIds(): NameCascadeSketchIds {
    return { name: 61, submit: 66, nameFilter: 67, yearFilter: 68, legislationFilter: 69, cycleFilter: 70, moduleFilter: 71, table: 72 };
  }

  protected _createLegend(): string {
    return 'Nuevo proyecto:';
  }

  protected _namePlaceholder(): string {
    return 'Nombre del proyecto';
  }

  protected _nameFilterPlaceholder(): string {
    return 'Filtrar por proyecto';
  }

  protected _emptyMessage(): string {
    return 'No hay proyectos registrados';
  }

  protected _deleteConfirmMessage(row: ProjectRow): string {
    return `¿Eliminar el proyecto ${row.name}?`;
  }

  protected _buildController(
    legislationService: LegislationService,
    cycleService: CycleService,
    moduleService: ModuleService,
  ): NameCascadeController<Project> {
    return new ProjectController(
      this.projectService ?? new HttpProjectService(),
      legislationService,
      cycleService,
      moduleService,
    );
  }

  protected _rowTemplate(row: ProjectRow): TemplateResult {
    return html`
      <tr>
        <td class=${TD_CLASS}>${row.name}</td>
        <td class=${TD_CLASS}>${row.moduleName}</td>
        <td class=${TD_CLASS}>${row.cycleName}</td>
        <td class=${TD_CLASS}>${row.legislationName ?? ''}</td>
        <td class=${TD_CLASS}>${row.startYear ?? ''}</td>
        <td class=${TD_CLASS}><button class=${classesFor('icon-button')} data-action="edit" @click=${() => this._startEdit(row)}>Icono editar</button></td>
        <td class=${TD_CLASS}><button class=${classesFor('icon-button', 'danger')} data-action="delete" @click=${() => this._handleDeleteClick(row)}>Icono borrar</button></td>
      </tr>
    `;
  }

  protected _editRowTemplate(row: ProjectRow): TemplateResult {
    return html`
      <tr>
        <td class=${TD_CLASS}><input type="text" class=${classesFor('text-input')} .value=${this._editName} @input=${this._handleEditNameInput} /></td>
        <td class=${TD_CLASS}>${row.moduleName}</td>
        <td class=${TD_CLASS}>${row.cycleName}</td>
        <td class=${TD_CLASS}>${row.legislationName ?? ''}</td>
        <td class=${TD_CLASS}>${row.startYear ?? ''}</td>
        <td class=${TD_CLASS}>
          <button class=${classesFor('button', 'secondary', 'sm')} data-action="save" ?disabled=${this._editLoading} @click=${() => this._handleSaveEditClick(row.id)}>Guardar</button>
        </td>
        <td class=${TD_CLASS}></td>
      </tr>
    `;
  }
}
customElements.define('corrector-projects-form', CorrectorProjectsForm);
