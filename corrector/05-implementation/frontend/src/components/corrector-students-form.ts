import { html } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { HttpStudentService } from '../services/student.service';
import type { Student, StudentService } from '../services/student.service';
import type { LegislationService } from '../services/legislation.service';
import type { CycleService } from '../services/cycle.service';
import type { ModuleService } from '../services/module.service';
import { StudentController } from '../controllers/student-controller';
import type { StudentRow } from '../controllers/student-controller';
import type { GestionTab } from './gestion-nav';
import { NameCascadeCrudForm } from '../controllers/name-cascade-crud-form';
import type { NameCascadeController, NameCascadeSketchIds } from '../controllers/name-cascade-crud-form';
import type { CascadeSketchNumbers } from '../controllers/form-cascade-engine';

// corrector-students-form
// sketchNumbers: 48 (nombre), 49 (año — navegación), 50 (legislación —
// navegación), 51 (ciclo — FK real student.cycle_id), 52 (módulo — FK real
// vía student_module), 53 (Nuevo), 54 (Subir lista), 55 (filtro nombre), 56
// (filtro año), 57 (filtro legislación), 58 (filtro ciclo), 59 (filtro
// módulo), 60 (tabla)
export class CorrectorStudentsForm extends NameCascadeCrudForm<Student> {
  studentService?: StudentService;

  private _studentController!: StudentController;
  private _uploadLoading = false;
  private _uploadErrorMessage = '';

  protected _gestionTab(): GestionTab {
    return 'alumnos';
  }

  protected _cascadeSketchNumbers(): CascadeSketchNumbers {
    return { year: 49, legislation: 50, cycle: 51, module: 52 };
  }

  protected _sketchIds(): NameCascadeSketchIds {
    return { name: 48, submit: 53, nameFilter: 55, yearFilter: 56, legislationFilter: 57, cycleFilter: 58, moduleFilter: 59, table: 60 };
  }

  protected _createLegend(): string {
    return 'Nuevo alumno:';
  }

  protected _namePlaceholder(): string {
    return 'Nombre del alumno';
  }

  protected _nameFilterPlaceholder(): string {
    return 'Filtrar por nombre';
  }

  protected _emptyMessage(): string {
    return 'No hay alumnos registrados';
  }

  protected _deleteConfirmMessage(row: StudentRow): string {
    return `¿Eliminar al alumno ${row.name}?`;
  }

  protected _buildController(
    legislationService: LegislationService,
    cycleService: CycleService,
    moduleService: ModuleService,
  ): NameCascadeController<Student> {
    this._studentController = new StudentController(
      this.studentService ?? new HttpStudentService(),
      legislationService,
      cycleService,
      moduleService,
    );
    return this._studentController;
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

    const state = await this._studentController.upload(file);
    this._uploadLoading = false;

    if (state.status === 'success') {
      this._rows = await this._studentController.list();
      this._render();
      return;
    }

    this._uploadErrorMessage = state.message;
    this._render();
  }

  protected _renderCreateExtra(): TemplateResult {
    return html`
      <input
        data-element-id="54"
        type="file"
        accept=".csv,.json,.yaml,.yml"
        ?disabled=${this._uploadLoading}
        @change=${this._handleUploadChange}
      />
    `;
  }

  protected _renderBelowForm(): TemplateResult {
    return html`<div role="alert">${this._uploadErrorMessage}</div>`;
  }

  protected _rowTemplate(row: StudentRow): TemplateResult {
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

  protected _editRowTemplate(row: StudentRow): TemplateResult {
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
