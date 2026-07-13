// Infrastructure module — not tied to a single boceto sketchNumber (reused
// across Alumnos #49-52, Proyectos #62-65, Profesorado #37-40).

import { describe, it, expect } from 'bun:test';
import { render } from 'lit-html';
import type { LegislationService } from '../src/services/legislation.service';
import type { CycleService } from '../src/services/cycle.service';
import type { ModuleService } from '../src/services/module.service';
import { FormCascadeEngine } from '../src/controllers/form-cascade-engine';

const LEGISLATIONS = [{ id: 1, name: 'LOMLOE', startYear: 2020 }];
const CYCLES = [{ id: 1, name: 'DAW' }];
const MODULES = [
  { id: 1, name: 'DEW', weeklyHours: 7, cycleId: 1, cycleName: 'DAW', legislationId: 1, legislationName: 'LOMLOE' },
];

function makeLegislationService(): LegislationService {
  return {
    list: async () => ({ ok: true, items: LEGISLATIONS }),
    create: async (name, startYear) => ({ ok: true, item: { id: 1, name, startYear } }),
    update: async (id, data) => ({ ok: true, item: { id, name: data.name ?? '', startYear: data.startYear ?? 0 } }),
    delete: async () => ({ ok: true }),
  };
}

function makeCycleService(): CycleService {
  return {
    list: async () => ({ ok: true, items: CYCLES }),
    create: async (name) => ({ ok: true, item: { id: 1, name } }),
    update: async (id, name) => ({ ok: true, item: { id, name } }),
    delete: async () => ({ ok: true }),
  };
}

function makeModuleService(): ModuleService {
  return {
    list: async () => ({ ok: true, items: MODULES }),
    create: async (data) => ({ ok: true, item: { id: 1, ...data, cycleName: '', legislationName: '' } }),
    update: async (id, data) => ({
      ok: true,
      item: { id, name: data.name ?? '', weeklyHours: data.weeklyHours ?? 0, cycleId: data.cycleId ?? 0, cycleName: '', legislationId: data.legislationId ?? 0, legislationName: '' },
    }),
    delete: async () => ({ ok: true }),
  };
}

function makeEngine(notify: () => void = () => {}): FormCascadeEngine {
  return new FormCascadeEngine(
    makeLegislationService(),
    makeCycleService(),
    makeModuleService(),
    { year: 49, legislation: 50, cycle: 51, module: 52 },
    notify,
  );
}

async function flush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('controllers/form-cascade-engine — FormCascadeEngine', () => {
  it('loads year options from the legislation service', async () => {
    const engine = makeEngine();
    await engine.loadYearOptions();
    expect(engine.yearOptions).toEqual([2020]);
  });

  it('cascades: selecting a year loads legislation options and resets downstream selections', async () => {
    let renders = 0;
    const engine = makeEngine(() => { renders += 1; });
    engine.selectedCycle = '1';
    engine.selectedModule = '1';

    engine.handleYearChange({ target: { value: '2020' } } as unknown as Event);
    expect(engine.selectedCycle).toBe('');
    expect(engine.selectedModule).toBe('');
    await flush();

    expect(engine.legislationOptions).toEqual(LEGISLATIONS);
    expect(renders).toBeGreaterThan(0);
  });

  it('cascades: selecting a legislation loads cycle options', async () => {
    const engine = makeEngine();
    engine.selectedYear = '2020';
    engine.handleLegislationChange({ target: { value: '1' } } as unknown as Event);
    await flush();
    expect(engine.cycleOptions).toEqual(CYCLES);
  });

  it('cascades: selecting a cycle loads module options', async () => {
    const engine = makeEngine();
    engine.handleCycleChange({ target: { value: '1' } } as unknown as Event);
    await flush();
    expect(engine.moduleOptions).toEqual(MODULES);
  });

  it('clears the year error once a year is selected', () => {
    const engine = makeEngine();
    engine.errors.year = true;
    engine.handleYearChange({ target: { value: '2020' } } as unknown as Event);
    expect(engine.errors.year).toBe(false);
  });

  it('reset() clears every selection, option list, and error', () => {
    const engine = makeEngine();
    engine.selectedYear = '2020';
    engine.selectedLegislation = '1';
    engine.legislationOptions = LEGISLATIONS;
    engine.errors.module = true;

    engine.reset();

    expect(engine.selectedYear).toBe('');
    expect(engine.selectedLegislation).toBe('');
    expect(engine.legislationOptions).toEqual([]);
    expect(engine.errors.module).toBe(false);
  });

  it('render() produces the 4 selects with their sketchNumbers', () => {
    const engine = makeEngine();
    const container = document.createElement('div');
    render(engine.render(), container);
    const selects = container.querySelectorAll('select');
    expect(selects.length).toBe(4);
    expect(selects[0]!.getAttribute('data-element-id')).toBe('49');
    expect(selects[1]!.getAttribute('data-element-id')).toBe('50');
    expect(selects[2]!.getAttribute('data-element-id')).toBe('51');
    expect(selects[3]!.getAttribute('data-element-id')).toBe('52');
  });

  it('render() disables downstream selects until their parent is chosen', () => {
    const engine = makeEngine();
    const container = document.createElement('div');
    render(engine.render(), container);
    const selects = container.querySelectorAll('select');
    expect(selects[1]!.disabled).toBe(true);
    expect(selects[2]!.disabled).toBe(true);
    expect(selects[3]!.disabled).toBe(true);
  });
});
