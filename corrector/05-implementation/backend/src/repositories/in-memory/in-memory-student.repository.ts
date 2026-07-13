import type {
  StudentRepository,
  StudentFilters,
  Student,
  CreateStudentData,
} from '../student.repository';
import type { Store } from './store';
import { nextId } from './store';

export class InMemoryStudentRepository implements StudentRepository {
  constructor(private readonly store: Store) {}

  async findAll(filters: StudentFilters = {}): Promise<Student[]> {
    let list = this.store.students;
    if (filters.name !== undefined) {
      const q = filters.name.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q));
    }
    if (filters.cycleId !== undefined) {
      list = list.filter((s) => s.cycleId === filters.cycleId);
    }
    if (filters.moduleId !== undefined) {
      const studentIds = this.store.projectStudents.map((ps) => ps.studentId);
      const projectIds = this.store.projects
        .filter((p) => p.moduleId === filters.moduleId)
        .map((p) => p.id);
      const filteredStudentIds = this.store.projectStudents
        .filter((ps) => projectIds.includes(ps.projectId))
        .map((ps) => ps.studentId);
      list = list.filter(
        (s) => filteredStudentIds.includes(s.id) || studentIds.includes(s.id),
      );
    }
    return list;
  }

  async findById(id: number): Promise<Student | null> {
    return this.store.students.find((s) => s.id === id) ?? null;
  }

  async create(data: CreateStudentData): Promise<Student> {
    const cycle = this.store.cycles.find((c) => c.id === data.cycleId);
    const student: Student = {
      id: nextId(this.store, 'student'),
      name: data.name,
      cycleId: data.cycleId,
      cycleName: cycle?.name ?? '',
      modules: [],
    };
    this.store.students.push(student);
    return student;
  }

  async update(id: number, data: Partial<CreateStudentData>): Promise<Student> {
    const student = this.store.students.find((s) => s.id === id);
    if (!student) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    if (data.name !== undefined) student.name = data.name;
    if (data.cycleId !== undefined) student.cycleId = data.cycleId;
    return student;
  }

  async delete(id: number): Promise<void> {
    const idx = this.store.students.findIndex((s) => s.id === id);
    if (idx < 0) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    this.store.students.splice(idx, 1);
  }

  async isAssignedToProject(id: number): Promise<boolean> {
    return this.store.projectStudents.some((ps) => ps.studentId === id);
  }

  async hasCorrections(id: number): Promise<boolean> {
    return this.store.corrections.some((c) => c.studentId === id);
  }
}
