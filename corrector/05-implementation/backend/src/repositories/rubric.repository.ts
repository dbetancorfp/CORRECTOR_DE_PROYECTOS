export interface RubricLevel {
  id: number;
  name: string;
  score: number;
  displayOrder: number;
}

export interface RubricItemFull {
  id: number;
  rubricId: number;
  description: string;
  displayOrder: number;
  levels: RubricLevel[];
}

export interface RubricFull {
  id: number;
  moduleId: number;
  academicYear: string;
  frozen: boolean;
  items: RubricItemFull[];
}

export interface AddRubricLevelData {
  name: string;
  score: number;
  displayOrder: number;
}

// replaceAll() already takes academicYear as its own parameter and applies
// it to every item it (re)creates — an item never carries its own
// academicYear there, unlike addItem()/updateItem() where it's the only
// place academicYear comes from.
export interface RubricItemInput {
  description: string;
  displayOrder: number;
  levels: AddRubricLevelData[];
}

export interface AddRubricItemData extends RubricItemInput {
  academicYear: string;
}

export interface RubricRepository {
  findByModule(moduleId: number, academicYear: string): Promise<RubricFull | null>;
  addItem(moduleId: number, item: AddRubricItemData): Promise<RubricItemFull>;
  updateItem(itemId: number, data: Partial<AddRubricItemData>): Promise<RubricItemFull>;
  deleteItem(itemId: number): Promise<void>;
  hasCorrectionItems(itemId: number): Promise<boolean>;
  isFrozen(id: number, academicYear?: string): Promise<boolean>;
  getExcelenteSumExcluding(moduleId: number, excludeItemId?: number): Promise<number>;
  replaceAll(moduleId: number, academicYear: string, items: RubricItemInput[]): Promise<void>;
}
