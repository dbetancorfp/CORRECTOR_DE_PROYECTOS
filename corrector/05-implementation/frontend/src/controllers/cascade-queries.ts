import type { Legislation, LegislationService } from '../services/legislation.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import type { Module, ModuleService } from '../services/module.service';
import * as cascade from './academic-cascade';

// Every controller behind a screen with an año→legislación→ciclo→módulo
// cascade (Student/Project via NameCascadeControllerBase, Teacher,
// Correction, Rubric) delegates these 5 lookups identically — only the
// create/update/delete/filter behaviour built on top of them differs per
// entity. Extracted once real duplication showed up across all four
// controllers (same precedent as academic-cascade.ts itself, one layer up).
export abstract class CascadeQueries {
  constructor(
    protected readonly legislationService: LegislationService,
    protected readonly cycleService: CycleService,
    protected readonly moduleService: ModuleService,
  ) {}

  async loadLegislations(): Promise<Legislation[]> {
    return cascade.loadLegislations(this.legislationService);
  }

  async loadYearOptions(): Promise<number[]> {
    return cascade.loadYearOptions(this.legislationService);
  }

  async loadLegislationOptions(year: number | null): Promise<Legislation[]> {
    return cascade.loadLegislationOptions(this.legislationService, year);
  }

  async loadCycleOptions(legislationId: number | null): Promise<Cycle[]> {
    return cascade.loadCycleOptions(this.cycleService, legislationId);
  }

  async loadModuleOptions(cycleId: number | null): Promise<Module[]> {
    return cascade.loadModuleOptions(this.moduleService, cycleId);
  }
}
