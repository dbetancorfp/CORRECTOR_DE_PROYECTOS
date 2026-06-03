alwaysApply: true

# CLAUDE.md

## Project

**Corrector de Proyectos** — web app for FP teachers (Formación Profesional, Spain) to manage
and grade end-of-cycle student projects via rubric-based scoring.

Author: David Betancor, Profesor FP, IES Telesforo Bravo.

| Artifact | Path | Notes |
|----------|------|-------|
| Boceto | `corrector/01-boceto/html-source-prototype/` | 90 elements · 11 screens · `data-element-id="N"` (sketchNumber). Registry: `boceto-elements.md` |
| Entrevista cliente | `corrector/02-conversacion-cliente/transcripcion.md` | Client interview transcript — source of business rules |
| Schema BD | `corrector/05-implementation/backend/schema.sql` | PostgreSQL 16 DDL — source of truth for data model |

## Core Rules

- **One step at a time.** Never advance past the current pipeline phase without confirmation.
- **TDD.** Write failing tests before implementation.
- **Type safety.** All code fully typed — no `any`, no implicit returns, no untyped params.
- **Clear naming.** Descriptive names. No premature abstraction. No unused code.
- **Question assumptions.** Flag repeated patterns and potential inconsistencies.

## Language

All technical artifacts in English: code, comments, TypeScript types and interfaces,
error messages, logs, docs, config, git commits, test names, schema names.

UI-facing strings and domain vocabulary may use Spanish where it reflects real usage
(e.g. `Legislación`, `Ciclo`, `Rúbrica`).

## Tech Stack

| Layer | Technology |
|-------|------------|
| LLM / Agents | Claude API `claude-sonnet-4-6` |
| Embeddings | OpenAI `text-embedding-3-small` |
| RAG database | PostgreSQL 16 + pgvector 0.7 |
| Backend | **Bun** + Express + TypeScript |
| Schema validation | Zod 3.x |
| Frontend | Web Components (native) + lit-html standalone + Tailwind CSS 3.x + TypeScript |
| Frontend build | `bun build` — `src/frontend/*.ts` → `dist/frontend/*.js` → `<script type="module">` |
| Tests (unit) | `bun test` — backend + frontend unit tests (Jest-compatible API) |
| Tests (e2e) | Cypress — functional and integration tests |
| Docs | Static HTML → `docs/` → GitHub Pages |
| CI/CD | GitHub Actions |

## RAG Spec-Driven Development Pipeline

### The sketchNumber invariant

Every interactive element is annotated `data-element-id="N"`. That integer is the
**universal foreign key** linking every artifact in the pipeline:

```
Boceto (#N) → UI Spec → Functional Spec → Use Case → Test (red) → Code (green)
```

No element may appear in a downstream phase unless it was numbered in the boceto.

### Agents

```
0 → ┌─ 1 (Diseñador Front)     ─┐
    └─ 2 (Analista de Negocio) ─┘→ 3 → GATE → 4 → 5 → 6 → 7 → 8
```

| # | Agente | Responsabilidad | Input | Output |
|---|--------|-----------------|-------|--------|
| 0 | Boceto Parser | Escanea los HTML, produce el índice estructural y el registro descriptivo de elementos | Ficheros `.html` de `html-source-prototype/` | `boceto-metadata.json` · `boceto-elements.md` |
| 1 ∥ | Diseñador Front | Especifica cada elemento UI (tipo, props, estados, interacciones, validaciones) | `boceto-metadata.json` + ficheros `.html` + `boceto-elements.md` | `ui-spec.json` |
| 2 ∥ | Analista de Negocio | Entrevista al cliente, completa la transcripción y propone cambios en el boceto para revisión humana | Entrevista inicial + ficheros `.html` + `boceto-elements.md` | `transcripcion.md` completa + `boceto-suggestions.md` |
| 3 | Generador Func. Spec | Convierte transcripción + UI spec en especificación funcional estructurada y verificable | `transcripcion.md` + `ui-spec.json` | `functional-spec.json` |
| — | **GATE HUMANO** | Verifica que cada sketchNumber tiene func-spec y viceversa. Sin huérfanos. | `ui-spec.json` + `functional-spec.json` | `reconciliation.json { valid:true }` |
| 4 | Arquitecto de Requisitos | Genera casos de uso, DDL PostgreSQL y contratos API a partir de las specs validadas | `functional-spec.json` + `ui-spec.json` + `reconciliation.json` + `boceto-metadata.json` | `use-cases.md` + `schema.sql` + `api-contracts.md` |
| 5 | Validador de Alineación | Verifica 3-way: boceto ↔ transcripción ↔ schema + api-contracts cubren todos los dataNeeds | `boceto-metadata.json` + `transcripcion.md` + `functional-spec.json` + `schema.sql` + `api-contracts.md` | `alignment-report.json { valid:true }` |
| 6 | Ingeniero TDD | Genera tests unitarios en rojo a partir de los criterios de aceptación | `functional-spec.json` + `use-cases.md` + `alignment-report.json` + `api-contracts.md` + `schema.sql` | `*.test.ts` (failing) |
| 7 | Implementador | Escribe el código mínimo para que los tests pasen | Tests en rojo + `use-cases.md` + `api-contracts.md` + `schema.sql` + `ui-spec.json` + `functional-spec.json` | Backend TS + Web Components TS |
| 8 | Revisor / QA *(opt.)* | Valida calidad del código, convenciones TypeScript y ausencia de dead code | Implementación completa | Informe de revisión |

**1 ∥ 2** — ejecución en paralelo; el Agente 3 espera a que ambos terminen.
Each `describe()` block in test files must reference a `sketchNumber`.
Each agent has a single responsibility — no agent mixes generation with validation.

### Handoff pattern

**Generate → Validate (Zod) → Persist (RAG) → Next agent queries RAG**

### RAG table: `knowledge_base`

| Column | Type | Notes |
|--------|------|-------|
| `content` | TEXT | Serialised JSON artifact |
| `embedding` | vector(1536) | HNSW index |
| `phase` | VARCHAR | `ui-spec` · `func-spec` · `use-case` · `test-red` · `code` |
| `sketch_number` | INT | Traceability key |
| `feature_id` | TEXT | e.g. `corrector-v1` |
| `agent` | TEXT | Producer |
| `version` | INT | Incremental |

Retrieval: hybrid search — vector similarity + structured filters on `phase`, `feature_id`,
`sketch_number`.

### Zod schemas

- `UISpecSchema` — `screens[].components[]` with `sketchNumber`, `type`, `props`, `states`, `interactions`
- `FunctionalSpecSchema` — `elementSpecs[]` with `sketchNumber`, `behavior`, `businessRules`, `acceptanceCriteria`; plus `globalRules[]`
- `ReconciliationSchema` — `valid`, `boceto_numbers`, `spec_numbers`, `orphaned_sketch_elements`, `orphaned_spec_rules`

### CLI

```bash
node cli/index.js run-agent designer-front --feature-id corrector-v1
node cli/index.js run-agent business-analyst --feature-id corrector-v1
node cli/index.js reconcile --feature-id corrector-v1          # GATE HUMANO
node cli/index.js run-agent requirement-architect --feature-id corrector-v1
node cli/index.js run-agent tdd-engineer --feature-id corrector-v1
bun test                                                        # RED ✗
node cli/index.js run-agent implementer --feature-id corrector-v1
bun test                                                        # GREEN ✅
```

Slash commands (`.claude/commands/`): `/designer-front`, `/business-analyst`,
`/requirement-architect`, `/tdd-engineer` *(pending)*.

## Repository Structure

```
corrector/
  01-boceto/html-source-prototype/   # Annotated HTML screens (11 screens, 90 elements)
  02-conversacion-cliente/           # Client interview transcript
  03-generated-artifacts/            # ui-spec.json, functional-spec.json, reconciliation.json
  04-use-cases/                      # use-cases.md
  05-implementation/
    backend/                         # schema.sql, api-contracts.md, Bun/Express server
    frontend/                        # Web Components

lib/agents/        # Agent implementations (.js) + role definitions (.md)
lib/schemas/       # Zod schemas
lib/tools/         # claude-client, rag-client, artifact-manager, handoff-validator, etc.
lib/orchestrator/  # Pipeline state machine
cli/commands/      # CLI commands (create-project, run-agent, validate, reconcile, generate-docs)
docs/              # Static docs → GitHub Pages
```

## Frontend: Web Components

One file per component. Shadow DOM always open. Render with lit-html only. Never `innerHTML`.
TypeScript compiled with `bun build` — source in `src/frontend/`, output in `dist/frontend/`.

### Component skeleton

```ts
// corrector-button.ts
import { html, render } from 'lit-html';

export class CorrectorButton extends HTMLElement {
  private _disposables: Array<() => void> = [];

  connectedCallback(): void {
    this.attachShadow({ mode: 'open' });
    this._render();
    const onClick = (): void => this._handleClick();
    this.shadowRoot!.addEventListener('click', onClick);
    this._disposables.push(() => this.shadowRoot!.removeEventListener('click', onClick));
  }

  disconnectedCallback(): void {
    this._disposables.forEach(fn => fn());
    this._disposables = [];
  }

  private _handleClick(): void {
    this.dispatchEvent(new CustomEvent('corrector:action', {
      bubbles: true, composed: true,
      detail: { id: this.getAttribute('data-id') },
    }));
  }

  private _render(): void {
    const label  = this.getAttribute('label') ?? 'OK';
    const active = this.hasAttribute('active');
    const items: string[] = JSON.parse(this.getAttribute('items') ?? '[]');
    render(html`
      <button .value=${label} @click=${(): void => this._handleClick()} ?disabled=${!active}>
        ${label}
      </button>
      <ul>${items.map(i => html`<li>${i}</li>`)}</ul>
    `, this.shadowRoot!);
  }
}
customElements.define('corrector-button', CorrectorButton);
```

### Rules

| Rule | Detail |
|------|--------|
| Name | `corrector-*` prefix; registered with `customElements.define` |
| Shadow DOM | `this.attachShadow({ mode: 'open' })` in `connectedCallback` |
| Rendering | `lit-html` only — never `innerHTML` |
| Bindings | `.prop=` · `@event=` · `?attr=` · `${repeat(...)}` |
| Lifecycle | `connectedCallback`: setup + render + subscribe. `disconnectedCallback`: flush disposables |
| Disposables | Every listener/observer/interval → push cleanup fn into `this._disposables` |
| Events | `new CustomEvent('corrector:verb-noun', { bubbles:true, composed:true, detail:{} })` |
| Modules | `export class` per file; loaded via `<script type="module">` |

### Naming

| What | Pattern | Example |
|------|---------|---------|
| File | `kebab-case.ts` | `corrector-rubrica-cell.ts` |
| Class | `PascalCase` | `CorrectorRubricaCell` |
| Element | `corrector-*` | `corrector-rubrica-cell` |
| Event | `corrector:verb-noun` | `corrector:grade-selected` |

## Domain

### Data model

- **Legislación**: abbreviation (e.g. LOMLOE), start/end year
- **Ciclo**: name, linked to legislación
- **Módulo**: name, abbreviation (e.g. DEW), legislación, weekly hours, ciclo
- **Profesor**: username, password, assigned ciclo + módulos
- **Alumno**: anonymised code (e.g. `JJ499`), ciclo, legislación
- **Proyecto**: name, list of alumnos
- **Rúbrica**: per-module scoring grid; 5 levels (Excelente → Mal), each with a numeric value;
  max total score defined; shared across all projects of that module

### Roles

- **Admin** — system config: legislaciones, ciclos, módulos, profesorado
- **Profesor** — class management: alumnos, proyectos, rúbrica; grades and views/prints notes
- **Tutor** — restricted profesor: print notes only

### Screen flow

```
login
├── Admin → Gestión (tabs: Legislación · Ciclos · Módulos · Profesorado)
└── Profesor → Landing
    ├── Gestionar (tabs: Alumnos · Proyectos · Rúbrica)
    ├── Corregir proyecto
    ├── Visualizar notas
    └── Imprimir notas  (Tutor only)
```

### Notes

- Student IDs are anonymised codes — never real names.
- List filters (alumnos, proyectos, rúbrica) must be **reactive** — filter as user types.
- Bulk import via file upload: alumnos (CSV/Excel), rúbrica.
