alwaysApply: true

# CLAUDE.md

## Project

**Corrector de Proyectos** — web app for FP teachers (Formación Profesional, Spain) to manage
and grade end-of-cycle student projects via rubric-based scoring.

Author: David Betancor, Profesor FP, IES Telesforo Bravo.

| Artifact | Path | Notes |
|----------|------|-------|
| Boceto | `corrector/01-boceto/html-source-prototype/` | 122 elements · 12 screens · `data-element-id="N"` (sketchNumber). Registry: `corrector/01-boceto/html-source-prototype/boceto-elements.md` |
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
| Agent execution | Claude Code — slash commands point to a role file in `lib/agents/*/*.md`; Claude Code adopts that persona and runs directly in-session (see "Handoff pattern" below) |
| Artifact storage | Local filesystem (`corrector/01-05/`) — no database, no vector search (see "Planned but not built" below) |
| Backend | **Bun** + Express + TypeScript |
| Schema validation | Zod 3.x |
| Frontend | Web Components (native) + lit-html standalone + Tailwind CSS 3.x + TypeScript |
| Frontend build | `bun build` — `corrector/05-implementation/frontend/src/*.ts` → `corrector/05-implementation/frontend/dist/*.js` → `<script type="module">` |
| Tests (unit) | `bun test` — backend + frontend unit tests (Jest-compatible API) |
| Tests (e2e) | Cypress — functional and integration tests |
| Docs | MkDocs + Material for MkDocs — source `.md` in `docs/` → `mkdocs build` → `site/` → GitHub Pages |
| CI/CD | GitHub Actions |

## Spec-Driven Development Pipeline

### The sketchNumber invariant

Every interactive element is annotated `data-element-id="N"`. That integer is the
**universal foreign key** linking every artifact in the pipeline:

```
Boceto (#N) → UI Spec → Functional Spec → Use Case → Test (red) → Code (green) → E2E Test
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
| 8 | Ingeniero E2E | Genera tests Cypress e2e por caso de uso — flujo principal + alternativo crítico | `use-cases.md` + `ui-spec.json` + `functional-spec.json` + `api-contracts.md` | `corrector/05-implementation/frontend/cypress/e2e/*.cy.ts` |
| 9 | Revisor / QA | Audita SOLID en tests e implementación; rechaza y re-ejecuta agentes hasta que cumplan | Implementación completa + tests unitarios + tests e2e + `docs/solid.md` | `review-report.md` · PASS/FAIL + bucle de corrección |
| ★ | Migration Generator *(on demand)* | Genera el SQL de migración cuando `schema.sql` cambia entre iteraciones | `schema.sql` actual + versión anterior (git) + `migrations/` | `migrations/YYYYMMDD_NNN_*.sql` |
| ★ | CI Setup *(on demand)* | Genera y mantiene los workflows de GitHub Actions | `CLAUDE.md` + `package.json` + `.github/workflows/` | `.github/workflows/sonarcloud.yml` (bun test + SonarCloud) + `deploy-docs.yml` (MkDocs → GitHub Pages) — **no hay workflow de Cypress; e2e solo corre en local** |

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

**Each agent is a role file (`lib/agents/<agent>/<agent>.md`) that Claude Code reads and
executes directly in-session** — triggered by its slash command
(`.claude/commands/<agent>.md`, a one-line pointer to the role file) or the `Skill` tool.
There is no separate orchestrator process and no database in between: the agent reads its
declared inputs from the local filesystem (`corrector/01-05/`), generates its output, and
writes it back to the local filesystem for the next agent to read directly.

Exception: `lib/agents/designer-front/designer-front.js` is a real standalone Bun script
that calls the Anthropic API directly (model `claude-sonnet-4-6`) and writes its output via
`lib/tools/artifact-manager.js` — also to the local filesystem, never to a database. It
predates the Claude-Code-native approach above and is not required to run the pipeline;
`business-analyst.js`, `implementer.js`, `tdd-engineer.js` and `requirement-architect.js`
also exist but are unimplemented stubs (`throw new Error('Not implemented')`) — those four
agents run exclusively via their `.md` role file, like the other nine.

Validation: `ui-spec.json`, `functional-spec.json`, `reconciliation.json` and
`alignment-report.json` each have a real Zod schema in `lib/schemas/` (see "Zod schemas"
below). Markdown artifacts (`boceto-suggestions.md`, `use-cases.md`, `api-contracts.md`)
have no schema — they're free-form prose, reviewed by the human or the next agent reading
them directly.

### Planned but not built

An earlier design considered a shared `knowledge_base` table (PostgreSQL + pgvector, OpenAI
`text-embedding-3-small` embeddings, hybrid vector + structured-filter retrieval on `phase` /
`feature_id` / `sketch_number`) so agents could query prior artifacts instead of reading files
directly. **None of this exists.** `lib/tools/rag-client.js` and `lib/orchestrator/pipeline.js`
are both empty `// PLANNED — not yet implemented` stubs that nothing imports, and `schema.sql`
has no `pgvector` extension or `knowledge_base` table. If you're picking this up: either build
it for real, or delete the stub files — don't let them keep implying a mechanism that isn't
there.

### Zod schemas

- `UISpecSchema` — `screens[].components[]` with `sketchNumber`, `type`, `props`, `states`, `interactions`
- `FunctionalSpecSchema` — `appOverview`; `elementSpecs[]` with `sketchNumber`, `behavior`, `businessRules`, `dataNeeds`, `acceptanceCriteria`; plus `globalRules[]`
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
bun cli/index.js reconcile --feature-id corrector-v1

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
/reviewer                                                       # audita código, tests e implementación

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
| `/reviewer` | 9 — Revisor / QA | ✅ |
| `/doc-reviewer` | — Revisor de Documentación | ✅ |
| `/migration-generator` | ★ — Migration Generator | ✅ |
| `/ci-setup` | ★ — CI Setup | ✅ |
| `/db-schema-designer` | ★ — DB Schema Designer | ✅ |
| `/commit` | — Commit workflow | ✅ |

## Repository Structure

```
corrector/
  01-boceto/
    boceto-metadata.json               # Agent 0 output — screen index
    html-source-prototype/             # Annotated HTML screens (12 screens, 122 elements)
      boceto-elements.md               # Agent 0 output — element registry
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
      cypress/
        e2e/                           # Agent 8 output — Cypress e2e tests

lib/agents/        # One subfolder per agent: role definition (.md) — the file every
                   #   slash command and the Skill tool actually read and execute.
                   #   designer-front/designer-front.js is the one real standalone
                   #   implementation (calls the Anthropic API directly); business-analyst,
                   #   implementer, tdd-engineer and requirement-architect also have a .js
                   #   file but it's an unimplemented stub; the other 9 agents are .md-only.
lib/schemas/       # Zod schemas — ui-spec, functional-spec, reconciliation, alignment-report
lib/tools/         # artifact-manager + sketch-parser (real, used by designer-front.js);
                   #   claude-client (real, used only by designer-front.js); rag-client,
                   #   element-mapper, handoff-validator, test-generator — unimplemented stubs
lib/orchestrator/  # Unimplemented stub — no state machine actually runs
cli/commands/      # CLI commands
.claude/commands/  # Slash command entry points (.md)
docs/              # MkDocs source (.md) → GitHub Pages via mkdocs build
mkdocs.yml         # MkDocs + Material for MkDocs config
```

## Frontend: Web Components

One file per component. Shadow DOM always open. Render with lit-html only. Never `innerHTML`.
TypeScript compiled with `bun build` — source in `corrector/05-implementation/frontend/src/`,
output in `corrector/05-implementation/frontend/dist/`.

**The hard constraint is "no nested Shadow DOM", not "no shared code".** Never compose a
screen out of separate `corrector-*` custom elements nested inside another one's Shadow DOM —
`data-element-id="N"` must sit on the native element for Cypress `.type()`/`.click()` and for
`shadowRoot.querySelector()` in unit tests, and a second nested shadow root breaks both. Sharing
behaviour across near-identical screens via plain functions/classes (`admin-nav.ts`,
`FormCascadeEngine`, or an **abstract base class extending `HTMLElement`** that a screen's
single custom element extends) is fine and encouraged once duplication between screens is real
— there is still exactly one registered custom element, one Shadow DOM, per screen.

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
    this.dispatchEvent(new CustomEvent('corrector:button-clicked', {
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
| Bindings | `.prop=` · `@event=` · `?attr=` · `${items.map(...)}` (simple lists) · `${repeat(...)}` *(import `lit-html/directives/repeat.js` — large lists with key tracking)* |
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

- **Legislación**: name (e.g. LOMLOE), start year
- **Ciclo**: name only (no legislation FK — legislation is carried by modules, not cycles);
  can have 0 or 1 tutor; requires a tutor to be usable for corrections
- **Módulo**: name, weekly hours, ciclo, legislación (direct FK — the module is the entity
  that belongs to a specific legislation)
- **Profesor**: username, password_hash, rol (`admin,  profesor,  tutor`), not ENUMs; optionally tutor
  of one ciclo (`tutor_ciclo_id` nullable, UNIQUE); linked to módulos via `profesor_modulo`.
  No direct ciclo→profesor relation — the link is always ciclo→módulo→profesor.
- **Alumno**: `nombre` (free text — professor may enter a real name or an anonymised code
  such as `JJ499`; the system does not enforce a format), ciclo
- **Proyecto**: name, academic year (e.g. `2024-2025`), list of alumnos; no direct FK to ciclo
  (inferred via alumnos); one alumno belongs to at most one proyecto per academic year
- **Rúbrica**: scoring grid tied to one módulo + academic year (UNIQUE); module resource with
  no owner (no teacher FK); contains a variable number of items and levels (defined by the professor).
  Structure is a matrix item × level — each cell holds an independent numeric value.
  Correction flow: professor selects one level per item → system sums selected values and
  normalises to 10 automatically (max score is derived, not stored explicitly).
  Full item-level breakdown is persisted per correction to allow recalculation.

### Roles

- **Admin** (`rol = 'admin'` in `profesor` table) — system config: legislaciones, ciclos,
  módulos, profesorado; no module assignments, no tutor relationship
- **Profesor** (`rol = 'profesor'`) — class management: alumnos, proyectos, rúbrica; grades;
  views and prints notes (own corrected module only)
- **Tutor** (`rol = 'tutor'`) — same as Profesor, plus: Imprimir panorámica (all modules +
  final grade per student)

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

- `alumno.nombre` is free text — the professor decides whether to enter a real name or an
  anonymised code. The system imposes no format.
- List filters (alumnos, proyectos, rúbrica) must be **reactive** — filter as user types.
- Bulk import via file upload: alumnos (CSV/JSON/YAML), rúbrica (YAML).
