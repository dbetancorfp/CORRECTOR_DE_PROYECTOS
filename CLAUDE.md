# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Corrector de Proyectos** is a web application for teachers in Spanish vocational education (FP - Formación Profesional) to manage and grade end-of-cycle student projects using a rubric-based scoring system.

The project is currently at the **HTML prototype stage** — all files in `corrector/01-boceto/html-source-prototype/` are static HTML screens with no CSS, no JavaScript logic, and no backend. They are the **bocetos de entrada** to the RAG Spec-Driven pipeline (see below): 80 interactive elements are annotated with `data-element-id="N"` (`sketchNumber`) across 10 screens. The element registry is at `corrector/01-boceto/html-source-prototype/boceto-elements.md`. No build system, framework, or test runner is set up yet.

To view prototypes: open any `.html` file in `corrector/01-boceto/html-source-prototype/` directly in a browser.

## User roles

Three roles exist in the system:

- **Admin** — system-wide configuration: legislaciones, ciclos, módulos, profesorado
- **Profesor** — class-level management: alumnos, proyectos, rúbrica; can grade and view/print notes
- **Tutor** — restricted profesor that can only print notes (see comment in `vista_profesor-landing.html`)

## Screen flow

```
index.html (login)
├── Admin → Gestión tabbed panel
│   ├── Legislación  (vista_admin-tab_legislacion_seleccionado.html)
│   ├── Ciclos       (vista_admin-tab_ciclos_seleccionado.html)
│   ├── Módulos      (vista_admin-tab_modulos_seleccionado.html)
│   └── Profesorado  (vista_admin-tab_profesorado_seleccionado.html)
└── Profesor → Landing (vista_profesor-landing.html)
    ├── Gestionar → tabbed panel
    │   ├── Alumnos   (vista_profesor_landing-gestionar_tab_Alumnos_seleccionado.html)
    │   ├── Proyectos (vista_profesor_landing-gestionar_tab_Proyectos_seleccionado.html)
    │   └── Rúbrica   (vista_profesor_landing-gestionar_tab_Rubrica_seleccionado.html)
    ├── Corregir      (vista_profesor_landing-corregirProyecto.html — empty, not yet designed)
    ├── Visualizar notas
    └── Imprimir notas (tutor-only)
```

## Domain data model

- **Legislación**: abbreviation (e.g., LOMLOE), start year, end year
- **Ciclo**: name (e.g., "Desarrollo de aplicaciones web"), linked to a legislación
- **Módulo**: name, abbreviation (e.g., DEW), legislación, weekly hours, ciclo
- **Profesor**: username, password, assigned ciclo, assigned módulos
- **Alumno**: ID/name (e.g., JJ499), ciclo, legislación
- **Proyecto**: name, list of alumnos
- **Rúbrica**: per-project scoring grid with items and 5 grade levels — Excelente, Muy bien, Bien, Regular, Mal — each with a numeric value; has a maximum total score

## Key domain notes

- Student identifiers in the prototypes are anonymized codes (e.g., `JJ499`, `MnP454`), not real names.
- Filters on list screens (alumnos, proyectos, rúbrica) are described as "filtros reactivos" — they should filter in real time as the user types.
- The rúbrica tab shows a "Subir rúbrica" (upload rubric) action alongside inline editing, suggesting rubrics may be importable from a file.
- The alumnos tab has a "Subir lista de alumnos" action, suggesting bulk import from a file (likely CSV/Excel).

## Development methodology: RAG Spec-Driven Development

This app is built using a **RAG Spec-Driven Development** pipeline. The process converts two heterogeneous inputs — annotated HTML prototypes and a client conversation — into a complete, traceable application.

**Author / project origin**: David Betancor, Profesor FP, IES Telesforo Bravo.

### The sketchNumber principle

Every interactive element in `corrector/01-boceto/html-source-prototype/` is annotated with a unique integer (`data-element-id="N"`). That number is the universal foreign key linking every artefact in the pipeline:

```
Boceto (#N) → UI Spec → Functional Spec → Use Case → Test (rojo) → Código (verde)
```

No element can appear in a later phase unless it was numbered in the boceto. Zero ambiguity by design.

### Pipeline: 6 specialized agents

1. **Agente 1 — Diseñador Front**: annotated prototype + `boceto-metadata.json` → `ui-spec.json` (components, states, events per `sketchNumber`). Phase: `ui-spec`.
2. **Agente 2 — Analista de Negocio**: client conversation + UI Spec (from RAG) → `functional-spec.json` (behavior, businessRules, acceptanceCriteria per `sketchNumber`). Phase: `func-spec`.
3. **GATE HUMANO — Reconciliación**: verifies every `sketchNumber` in boceto has a func-spec and vice versa → `reconciliation.json { valid: true }`. Must pass before proceeding.
4. **Agente 3 — Arquitecto de Requisitos**: validated specs → use cases, PostgreSQL DDL, API contracts. Phase: `use-case`.
5. **Agente 4 — Ingeniero TDD**: acceptanceCriteria → failing test files (each `describe()` references a `sketchNumber`). Phase: `test-red`.
6. **Agente 5 — Implementador**: red tests + contracts → Node.js/Express backend + Web Components frontend until tests pass green. Phase: `code`.
7. **Agente 6 — Revisor/QA** (optional): validates code quality and OO conventions.

### RAG layer: PostgreSQL + pgvector

Each agent output is validated against a Zod schema and persisted to a `knowledge_base` table. Key columns:

| Column | Type | Description |
|--------|------|-------------|
| `content` | TEXT | Serialised JSON artefact |
| `embedding` | vector(1536) | OpenAI text-embedding-3-small; HNSW index |
| `phase` | VARCHAR | `ui-spec`, `func-spec`, `use-case`, `test-red`, `code` |
| `sketch_number` | INT | Traceability key |
| `feature_id` | TEXT | e.g. `corrector-v1` |
| `agent` | TEXT | Which agent produced this row |
| `version` | INT | Incremental; same feature can have multiple versions |

Retrieval uses **hybrid search**: vector similarity + structured filters (`phase`, `feature_id`, `sketch_number`).

### Handoff pattern

Every agent follows: **Generate → Validate (Zod) → Persist (RAG) → Next agent queries RAG**

### Key Zod schemas

- `UISpecSchema` — `screens[].components[]` with `sketchNumber`, `type`, `props`, `states`, `interactions`
- `FunctionalSpecSchema` — `elementSpecs[]` with `sketchNumber`, `behavior`, `businessRules`, `acceptanceCriteria`; plus `globalRules[]`
- `ReconciliationSchema` — `valid`, `boceto_numbers`, `spec_numbers`, `orphaned_sketch_elements`, `orphaned_spec_rules`

### Tech stack

| Layer | Technology |
|-------|-----------|
| LLM / Agents | Claude API (`claude-sonnet-4-6`) |
| Embeddings | OpenAI `text-embedding-3-small` |
| RAG database | PostgreSQL 16 + pgvector 0.7 |
| Backend | Node.js 20 LTS + Express |
| Schema validation | Zod 3.x |
| Frontend | Web Components OO + Tailwind CSS 3.x |
| Tests backend | Vitest + node-fetch |
| Tests frontend | @web/test-runner |
| Documentation | VitePress + GitHub Pages |
| CI/CD | GitHub Actions |

### CLI workflow (planned)

```bash
node cli run-agent designer-front --sketch boceto.png
node cli run-agent business-analyst --conversation chat.md
node cli reconcile --feature-id "corrector-v1"      # [GATE HUMANO]
node cli run-agent requirement-architect --feature-id "corrector-v1"
node cli run-agent tdd-engineer --feature-id "corrector-v1"
npm test                                              # RED ✗
node cli run-agent implementer --feature-id "corrector-v1"
npm test                                              # GREEN ✅
npm run docs:build && git push main                   # → GitHub Pages
```

### Repository structure (target)

```
lib/agents/          # 6 agent implementations
lib/schemas/         # Zod schemas (ui-spec, functional-spec, reconciliation, element-mapping)
lib/tools/           # claude-client, rag-client, artifact-manager, handoff-validator
lib/orchestrator/    # State machine / pipeline runner
cli/commands/        # create-project, run-agent, validate, reconcile, generate-docs
docs/                # VitePress source → GitHub Pages
examples/            # Full worked examples with boceto → code artefacts
```
