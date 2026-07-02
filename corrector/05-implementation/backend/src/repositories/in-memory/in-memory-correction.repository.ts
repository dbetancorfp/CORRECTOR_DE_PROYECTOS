import type {
  CorrectionRepository,
  CorrectionFilters,
  CorrectionResult,
  UpsertCorrectionData,
} from '../correction.repository';
import type { Store } from './store';
import { nextId } from './store';

export class InMemoryCorrectionRepository implements CorrectionRepository {
  constructor(private readonly store: Store) {}

  async findAll(filters: CorrectionFilters = {}): Promise<CorrectionResult[]> {
    let list = this.store.corrections;
    if (filters.moduleId !== undefined) {
      list = list.filter((c) => c.moduleId === filters.moduleId);
    }
    if (filters.academicYear !== undefined) {
      list = list.filter((c) => c.academicYear === filters.academicYear);
    }
    return list;
  }

  async findByStudentAndProject(
    studentId: number,
    projectId: number,
  ): Promise<CorrectionResult | null> {
    return (
      this.store.corrections.find(
        (c) => c.studentId === studentId && c.projectId === projectId,
      ) ?? null
    );
  }

  async upsert(data: UpsertCorrectionData): Promise<CorrectionResult> {
    const existing = this.store.corrections.find(
      (c) => c.studentId === data.studentId && c.projectId === data.projectId,
    );
    if (existing) {
      existing.finalScore = data.finalScore ?? existing.finalScore;
      existing.items = data.items;
      return existing;
    }
    const correction: CorrectionResult = {
      id: nextId(this.store, 'correction'),
      studentId: data.studentId,
      projectId: data.projectId,
      moduleId: data.moduleId,
      rubricId: data.rubricId,
      academicYear: data.academicYear,
      finalScore: data.finalScore ?? 0,
      items: data.items,
    };
    this.store.corrections.push(correction);
    return correction;
  }
}
