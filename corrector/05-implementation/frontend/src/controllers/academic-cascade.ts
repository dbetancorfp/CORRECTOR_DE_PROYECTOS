import type { Legislation, LegislationService } from '../services/legislation.service';
import type { Cycle, CycleService } from '../services/cycle.service';
import type { Module, ModuleService } from '../services/module.service';

// Shared año → legislación → ciclo → módulo cascade, identical across every
// screen that filters/creates by this chain (Proyectos, Alumnos, Profesorado,
// Corregir, Rúbrica, Ver Notas). Extracted once real duplication showed up
// across those controllers — same precedent as admin-nav.ts/gestion-nav.ts
// for the UI-layer nav duplication.

export async function loadLegislations(service: LegislationService): Promise<Legislation[]> {
  const result = await service.list();
  return result.ok ? result.items : [];
}

export async function loadYearOptions(service: LegislationService): Promise<number[]> {
  const legislations = await loadLegislations(service);
  return Array.from(new Set(legislations.map((l) => l.startYear))).sort((a, b) => a - b);
}

export async function loadLegislationOptions(
  service: LegislationService,
  year: number | null,
): Promise<Legislation[]> {
  if (year === null) return [];
  const legislations = await loadLegislations(service);
  return legislations.filter((l) => l.startYear === year);
}

// Filtered to cycles that already have a module under the chosen
// legislation — accepted bootstrap limitation (documented per-screen where
// it first came up: Módulos #27 / Profesorado #39 / Alumnos #51 / etc.).
export async function loadCycleOptions(
  service: CycleService,
  legislationId: number | null,
): Promise<Cycle[]> {
  if (legislationId === null) return [];
  const result = await service.list({ legislationId });
  return result.ok ? result.items : [];
}

export async function loadModuleOptions(
  service: ModuleService,
  cycleId: number | null,
): Promise<Module[]> {
  if (cycleId === null) return [];
  const result = await service.list();
  if (!result.ok) return [];
  return result.items.filter((m) => m.cycleId === cycleId);
}
