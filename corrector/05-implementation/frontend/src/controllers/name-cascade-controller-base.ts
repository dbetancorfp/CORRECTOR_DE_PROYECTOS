import { CascadeQueries } from './cascade-queries';
import type { NameCascadeController, NameCascadeErrors, NameCascadeItem, NameCascadeRow } from './name-cascade-crud-form';
import type { CreateResult } from './create-row-flow';
import type { EditResult } from './edit-row-flow';

export interface EntityServiceResult<Item> {
  ok: boolean;
  item?: Item;
  code?: string;
}

export interface DeleteServiceResult {
  ok: boolean;
  code?: string;
}

// Shared shape of every controller behind a NameCascadeCrudForm screen
// (StudentController, ProjectController): the año→legislación→ciclo→módulo
// cascade delegation and the create/update/delete validation+branching are
// identical; only the actual service call, field mapping, and user-facing
// messages differ (a genuine domain difference — Student has a real
// cycleId FK, Project derives academic_year from the chosen year instead).
export abstract class NameCascadeControllerBase<Item extends NameCascadeItem> extends CascadeQueries implements NameCascadeController<Item> {
  async list(): Promise<NameCascadeRow<Item>[]> {
    return this.filterRows('', '', '', '', '');
  }

  protected abstract _validateName(name: string): boolean;
  protected abstract _createEntity(name: string, yearRaw: string, cycleIdRaw: string, moduleIdRaw: string): Promise<EntityServiceResult<Item>>;
  protected abstract _createErrorMessage(): string;
  protected abstract _updateEntity(id: number, name: string): Promise<EntityServiceResult<Item>>;
  protected abstract _updateErrorMessage(): string;
  protected abstract _deleteEntity(id: number): Promise<DeleteServiceResult>;
  protected abstract _deleteBlockedMessage(): string;
  protected abstract _deleteErrorMessage(): string;

  abstract filterRows(
    nameQuery: string,
    yearQuery: string,
    legislationQuery: string,
    cycleQuery: string,
    moduleQuery: string,
  ): Promise<NameCascadeRow<Item>[]>;

  async create(name: string, yearRaw: string, legislationIdRaw: string, cycleIdRaw: string, moduleIdRaw: string): Promise<CreateResult<Item, NameCascadeErrors>> {
    const errors: NameCascadeErrors = {
      name: !this._validateName(name),
      year: yearRaw.trim() === '',
      legislation: legislationIdRaw.trim() === '',
      cycle: cycleIdRaw.trim() === '',
      module: moduleIdRaw.trim() === '',
    };
    if (Object.values(errors).some(Boolean)) {
      return { status: 'validation-error', errors };
    }

    const result = await this._createEntity(name, yearRaw, cycleIdRaw, moduleIdRaw);
    if (result.ok && result.item) return { status: 'success', item: result.item };
    return { status: 'error', message: this._createErrorMessage() };
  }

  async update(id: number, name: string): Promise<EditResult<Item>> {
    if (!this._validateName(name)) {
      return { status: 'validation-error' };
    }

    const result = await this._updateEntity(id, name);
    if (result.ok && result.item) return { status: 'success', item: result.item };
    return { status: 'error', message: this._updateErrorMessage() };
  }

  async delete(id: number): Promise<{ status: string; message?: string }> {
    const result = await this._deleteEntity(id);
    if (result.ok) return { status: 'success' };

    if (result.code === 'HAS_DEPENDANTS') {
      return { status: 'blocked', message: this._deleteBlockedMessage() };
    }
    return { status: 'error', message: this._deleteErrorMessage() };
  }
}
