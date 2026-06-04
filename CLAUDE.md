alwaysApply: true

# CLAUDE.md

## Project

**Corrector de Proyectos** — web app for FP teachers (Formación Profesional, Spain) to manage
and grade end-of-cycle student projects via rubric-based scoring.

Author: David Betancor, Profesor FP, IES Telesforo Bravo.

| Artifact | Path | Notes |
|----------|------|-------|
| Boceto | `corrector/01-boceto/html-source-prototype/` | 90 elements · 11 screens · `data-element-id="N"` (sketchNumber). Registry: `corrector/01-boceto/boceto-elements.md` |
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
| Frontend build | `bun build` — `corrector/05-implementation/frontend/src/*.ts` → `corrector/05-implementation/frontend/dist/*.js` → `<script type="module">` |
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
    └─ 2 (Analista de Negocio) ─┘→ 3 → 4 → GATE → 5 → 6 → 7 → 8 → 9
```

| # | Agente | Responsabilidad | Input | Output |
|---|--------|-----------------|-------|--------|
| 0 | Boceto Parser | Escanea los HTML, produce el índice estructural y el registro descriptivo de elementos | Ficheros `.html` de `html-source-prototype/` | `boceto-metadata.json` · `boceto-elements.md` |
| 1 ∥ | Diseñador Front | Especifica cada elemento UI (tipo, props, estados, interacciones, validaciones) | `boceto-metadata.json` + ficheros `.html` + `boceto-elements.md` | `ui-spec.json` |
| 2 ∥ | Analista de Negocio | Entrevista al cliente, completa la transcripción y propone cambios en el boceto para revisión humana | Entrevista inicial + ficheros `.html` + `boceto-elements.md` | `transcripcion.md` completa + `boceto-suggestions.md` |
| 3 | Validador de Alineación | Gate 3-way: verifica que boceto ↔ entrevista ↔ schema son consistentes antes de generar specs | `boceto-metadata.json` + `ui-spec.json` + `transcripcion.md` + `schema.sql` | `alignment-report.json { valid:true }` |
| 4 | Generador Func. Spec | Convierte transcripción + UI spec en especificación funcional estructurada y verificable | `transcripcion.md` + `ui-spec.json` + `alignment-report.json` | `functional-spec.json` |
| — | **GATE HUMANO** | Verifica que cada sketchNumber tiene su entrada en `functional-spec.json` y viceversa. Sin huérfanos. | `ui-spec.json` + `functional-spec.json` | `reconciliation.json { valid:true }` |
| 5 | Arquitecto de Requisitos | Genera casos de uso y contratos API a partir de las specs y el schema validados | `functional-spec.json` + `ui-spec.json` + `reconciliation.json` + `schema.sql` + `boceto-metadata.json` | `use-cases.md` + `api-contracts.md` |
| 6 | Ingeniero TDD | Genera tests unitarios en rojo a partir de los criterios de aceptación | `functional-spec.json` + `use-cases.md` + `alignment-report.json` + `api-contracts.md` + `schema.sql` | `*.test.ts` (failing) |
| 7 | Implementador | Escribe el código mínimo para que los tests pasen | Tests en rojo + `use-cases.md` + `api-contracts.md` + `schema.sql` + `ui-spec.json` + `functional-spec.json` | Backend TS + Web Components TS |
| 8 | Ingeniero E2E | Genera tests Cypress e2e por caso de uso — flujo principal + alternativo crítico | `use-cases.md` + `ui-spec.json` + `functional-spec.json` + `api-contracts.md` | `cypress/e2e/*.cy.ts` |
| 9 | Revisor / QA *(opt.)* | Valida calidad, convenciones TypeScript y ausencia de dead code | Implementación completa + tests unitarios + tests e2e | Informe de revisión |
| ★ | Migration Generator *(on demand)* | Genera el SQL de migración cuando `schema.sql` cambia entre iteraciones | `schema.sql` actual + versión anterior (git) + `migrations/` | `migrations/YYYYMMDD_NNN_*.sql` |
| ★ | CI Setup *(on demand)* | Genera y mantiene los workflows de GitHub Actions (CI + E2E) | `CLAUDE.md` + `package.json` + `.github/workflows/` | `.github/workflows/ci.yml` + `e2e.yml` |

**1 ∥ 2** — ejecución en paralelo; el Agente 3 espera a que ambos terminen.
Each `describe()` block in test files must reference a `sketchNumber`.
Each agent has a single responsibility — no agent mixes generation with validation.

### Re-entry protocol — when boceto changes

When the human reviews `boceto-suggestions.md` and decides to adopt one or more proposals:

1. Edit the affected `.html` files in `html-source-prototype/` manually
2. `/boceto-parser` — regenerates `boceto-metadata.json` + `boceto-elements.md`
3. `/designer-front` — regenerates `ui-spec.json`
4. Resume from Agent 3 (Validador de Alineación)

If only the `schema.sql` changes (no boceto changes):

1. Replace `schema.sql` with the updated version
2. `/migration-generator` — generates the SQL migration diff (if DB already exists)
3. Resume from Agent 3 (Validador de Alineación)

If only the interview transcript changes (Agent 2 re-run):

1. `/business-analyst` — updates `transcripcion.md` + new `boceto-suggestions.md`
2. Resume from Agent 3 (Validador de Alineación)

> **Rule:** Agent 3 (Validador de Alineación) is always the re-entry point after any
> change to the three original inputs (boceto · entrevista · schema).

### Handoff pattern

Applies to pipeline agents 0–9 (linear flow only):

**Generate → Validate (Zod) → Persist (RAG) → Next agent queries RAG**

Exceptions:
- **Validador de Alineación (3)** — reads only, does not persist to RAG; produces `alignment-report.json` as a local file
- **GATE HUMANO** — human decision step; produces `reconciliation.json` as a local file, not persisted to RAG
- **On-demand agents (★)** — operate independently, do not participate in RAG handoff

### RAG table: `knowledge_base`

| Column | Type | Notes |
|--------|------|-------|
| `content` | TEXT | Serialised JSON artifact |
| `embedding` | vector(1536) | HNSW index |
| `phase` | VARCHAR | See valid values below |
| `sketch_number` | INT \| NULL | Traceability key. `NULL` for artifacts not scoped to a single element (e.g. `use-cases.md`, `api-contracts.md`, `alignment-report.json`) |
| `feature_id` | TEXT | e.g. `corrector-v1` |
| `agent` | TEXT | Producer |
| `version` | INT | Incremental — same feature + phase can have multiple versions |

Valid `phase` values:

| Phase | Agent | Artifact |
|-------|-------|----------|
| `boceto-parse` | 0 Boceto Parser | `boceto-metadata.json` · `boceto-elements.md` |
| `ui-spec` | 1 Diseñador Front | `ui-spec.json` |
| `interview` | 2 Analista de Negocio | `transcripcion.md` · `boceto-suggestions.md` |
| `func-spec` | 4 Generador Func. Spec | `functional-spec.json` |
| `use-case` | 5 Arquitecto de Requisitos | `use-cases.md` · `api-contracts.md` |
| `test-red` | 6 Ingeniero TDD | `*.test.ts` |
| `code` | 7 Implementador | Backend TS · Web Components TS |
| `e2e` | 8 Ingeniero E2E | `cypress/e2e/*.cy.ts` |
| `review` | 9 Revisor / QA | Informe de revisión |

Note: `alignment` (Agent 3) and `gate` (GATE HUMANO) artifacts are local files only — not persisted to RAG.

Retrieval: hybrid search — vector similarity + structured filters on `phase`, `feature_id`,
`sketch_number`.

### Zod schemas

- `UISpecSchema` — `screens[].components[]` with `sketchNumber`, `type`, `props`, `states`, `interactions`
- `FunctionalSpecSchema` — `elementSpecs[]` with `sketchNumber`, `behavior`, `businessRules`, `acceptanceCriteria`; plus `globalRules[]`
- `ReconciliationSchema` — `valid`, `boceto_numbers`, `spec_numbers`, `orphaned_sketch_elements`, `orphaned_spec_rules`
- `AlignmentReportSchema` — `valid`, `checks[]` each with `type` (`boceto-transcript` | `boceto-schema` | `transcript-schema`), `status` (`pass` | `fail`), `issues[]`

Note: `boceto-suggestions.md` (Agent 2 output) is Markdown — no Zod schema.

### CLI

```bash
# ── Agent 0: parse boceto ─────────────────────────────────────────
/boceto-parser

# ── Agents 1 ∥ 2: UI spec + interview (parallel) ─────────────────
/designer-front
/business-analyst

# ── Agent 3: 3-way alignment gate ────────────────────────────────
/alignment-validator

# ── Agent 4: functional spec ──────────────────────────────────────
/generate-functional-spec

# ── GATE HUMANO: reconciliation ───────────────────────────────────
node cli/index.js reconcile --feature-id corrector-v1

# ── Agent 5: use-cases + API contracts ───────────────────────────
/requirement-architect

# ── Agent 6: TDD (tests must fail) ───────────────────────────────
/tdd-engineer
bun test                                                        # RED ✗

# ── Agent 7: implementation ───────────────────────────────────────
/implementer
bun test                                                        # GREEN ✅

# ── Agent 8: e2e tests ────────────────────────────────────────────
/e2e-engineer
bunx cypress run

# ── Agent 9: QA review (optional) ────────────────────────────────
# /reviewer (not yet defined)

# ── On-demand ─────────────────────────────────────────────────────
/migration-generator                                            # when schema.sql changes
/ci-setup                                                       # first time or stack change
/doc-reviewer                                                   # any time
```

**Slash commands available** (`.claude/commands/`):

| Command | Agent | Status |
|---------|-------|--------|
| `/boceto-parser` | 0 — Boceto Parser | ✅ |
| `/designer-front` | 1 — Diseñador Front | ✅ |
| `/business-analyst` | 2 — Analista de Negocio | ✅ |
| `/alignment-validator` | 3 — Validador de Alineación | ✅ |
| `/generate-functional-spec` | 4 — Generador Func. Spec | ✅ |
| `/requirement-architect` | 5 — Arquitecto de Requisitos | ✅ |
| `/tdd-engineer` | 6 — Ingeniero TDD | ✅ |
| `/implementer` | 7 — Implementador | ✅ |
| `/e2e-engineer` | 8 — Ingeniero E2E | ✅ |
| `/doc-reviewer` | — Revisor de Documentación | ✅ |
| `/migration-generator` | ★ — Migration Generator | ✅ |
| `/ci-setup` | ★ — CI Setup | ✅ |
| `/commit` | — Commit workflow | ✅ |

## Repository Structure

```
corrector/
  01-boceto/
    boceto-metadata.json               # Agent 0 output — screen index
    boceto-elements.md                 # Agent 0 output — element registry
    html-source-prototype/             # Annotated HTML screens (11 screens, 90 elements)
  02-conversacion-cliente/
    transcripcion.md                   # Agent 2 output — complete interview
    boceto-suggestions.md              # Agent 2 output — proposed boceto changes
  03-generated-artifacts/
    ui-spec.json                       # Agent 1 output
    functional-spec.json               # Agent 4 output
    reconciliation.json                # GATE HUMANO output
    alignment-report.json              # Agent 3 output
  04-use-cases/
    use-cases.md                       # Agent 5 output
  05-implementation/
    backend/
      schema.sql                       # Human input — source of truth for data model
      api-contracts.md                 # Agent 5 output
      migrations/                      # Migration Generator output
      src/                             # Agent 7 output — Bun + Express + TypeScript
      tests/                           # Agent 6 output — bun test unit tests
    frontend/
      src/                             # Agent 7 output — Web Components TypeScript
      dist/                            # bun build output (browser-ready JS)
      tests/                           # Agent 6 output — component unit tests
      cypress/e2e/                     # Agent 8 output — Cypress e2e tests

lib/agents/        # Slash command role definitions (.md) + programmatic implementations (.js)
lib/schemas/       # Zod schemas
lib/tools/         # claude-client, rag-client, artifact-manager, handoff-validator
lib/orchestrator/  # Pipeline state machine
cli/commands/      # CLI commands
.claude/commands/  # Slash command entry points (.md)
docs/              # Static docs → GitHub Pages
```

## Frontend: Web Components

One file per component. Shadow DOM always open. Render with lit-html only. Never `innerHTML`.
TypeScript compiled with `bun build` — source in `corrector/05-implementation/frontend/src/`,
output in `corrector/05-implementation/frontend/dist/`.

### Component skeleton

```ts
// corrector-button.ts
import { html, render } from 'lit-html';

export class CorrectorButton extends HTMLElement {
  private _disposables: Array<() => void> = [];

  connectedCallback(): void {
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
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
- **Rúbrica**: scoring grid tied to a specific module; 5 levels (Excelente → Mal), each with
  a numeric value; max total score defined; used to grade the projects of that module

### Roles

- **Admin** — system config: legislaciones, ciclos, módulos, profesorado
- **Profesor** — class management: alumnos, proyectos, rúbrica; grades; views and prints notes (own corrected module only)
- **Tutor** — same as Profesor, plus: Imprimir panorámica (all modules + final grade per student)

### Screen flow

```
login
├── Admin → Gestión (tabs: Legislación · Ciclos · Módulos · Profesorado)
└── Profesor → Landing
    ├── Gestionar (tabs: Alumnos · Proyectos · Rúbrica)
    ├── Corregir proyecto
    ├── Visualizar notas           (own corrected module only)
    ├── Imprimir notas del módulo  (own corrected module only)
    └── Imprimir panorámica        (Tutor only)
```

### Notes

- Student IDs are anonymised codes — never real names.
- List filters (alumnos, proyectos, rúbrica) must be **reactive** — filter as user types.
- Bulk import via file upload: alumnos (CSV/Excel), rúbrica.
