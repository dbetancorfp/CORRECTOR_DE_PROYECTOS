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

export interface FileParserService {
  parseStudents(content: Buffer, filename: string): Promise<ParsedStudent[]>;
  parseRubric(content: Buffer, filename: string): Promise<ParsedRubric>;
}
