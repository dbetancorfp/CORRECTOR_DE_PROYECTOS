import type {
  ProjectRepository,
  ProjectFilters,
  Project,
  CreateProjectData,
} from '../project.repository';
import type { Store } from './store';
import { nextId } from './store';

export class InMemoryProjectRepository implements ProjectRepository {
  constructor(private readonly store: Store) {}

  async findAll(filters: ProjectFilters = {}): Promise<Project[]> {
    let list = this.store.projects;
    if (filters.name !== undefined) {
      const q = filters.name.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    if (filters.moduleId !== undefined) {
      list = list.filter((p) => p.moduleId === filters.moduleId);
    }
    if (filters.legislationId !== undefined) {
      const mids = this.store.modules
        .filter((m) => m.legislationId === filters.legislationId)
        .map((m) => m.id);
      list = list.filter((p) => mids.includes(p.moduleId));
    }
    if (filters.academicYear !== undefined) {
      list = list.filter((p) => p.academicYear === filters.academicYear);
    }
    return list;
  }

  async findById(id: number): Promise<Project | null> {
    const p = this.store.projects.find((p) => p.id === id);
    if (!p) return null;
    return {
      ...p,
      studentCount: this.store.projectStudents.filter((ps) => ps.projectId === id).length,
    };
  }

  async create(data: CreateProjectData): Promise<Project> {
    const mod = this.store.modules.find((m) => m.id === data.moduleId);
    const cycle = mod ? this.store.cycles.find((c) => c.id === mod.cycleId) : null;
    const project: Project = {
      id: nextId(this.store, 'project'),
      name: data.name,
      academicYear: data.academicYear,
      moduleId: data.moduleId,
      moduleName: mod?.name ?? '',
      cycleName: cycle?.name ?? '',
      studentCount: 0,
    };
    this.store.projects.push(project);
    return project;
  }

  async update(id: number, data: Partial<CreateProjectData>): Promise<Project> {
    const project = this.store.projects.find((p) => p.id === id);
    if (!project) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    if (data.name !== undefined) project.name = data.name;
    if (data.academicYear !== undefined) project.academicYear = data.academicYear;
    return {
      ...project,
      studentCount: this.store.projectStudents.filter((ps) => ps.projectId === id).length,
    };
  }

  async delete(id: number): Promise<void> {
    const idx = this.store.projects.findIndex((p) => p.id === id);
    if (idx < 0) throw Object.assign(new Error('Not found'), { code: 'NOT_FOUND' });
    this.store.projects.splice(idx, 1);
    this.store.projectStudents = this.store.projectStudents.filter((ps) => ps.projectId !== id);
  }

  async hasStudents(id: number): Promise<boolean> {
    return this.store.projectStudents.some((ps) => ps.projectId === id);
  }
}
