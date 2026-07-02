export interface ParsedStudent {
  name: string;
  cycleId: number;
  moduleId: number;
}

export interface ParsedRubricLevel {
  name: string;
  score: number;
  displayOrder: number;
}

export interface ParsedRubricItem {
  description: string;
  displayOrder: number;
  levels: ParsedRubricLevel[];
}

export interface ParsedRubric {
  items: ParsedRubricItem[];
}

export interface StudentParserService {
  parseStudents(content: Buffer, filename: string): Promise<ParsedStudent[]>;
}

export interface RubricParserService {
  parseRubric(content: Buffer, filename: string): Promise<ParsedRubric>;
}
