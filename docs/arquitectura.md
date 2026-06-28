# Arquitectura técnica

Esta aplicación se construye mediante un pipeline **RAG Spec-Driven Development**:
los prototipos HTML anotados con números de boceto y una conversación de requisitos
se convierten, a través de 10 agentes Claude, en código backend + frontend completamente
trazable y testado.

## El principio sketchNumber

Cada elemento interactivo de los prototipos recibe un atributo `data-element-id="N"`.
Ese entero — el **sketchNumber** — es la clave foránea universal que vincula todos los
artefactos del pipeline:

```
Boceto (#N)
    → UI Spec         { sketchNumber: N, type, states, interactions }
    → Functional Spec { sketchNumber: N, behavior, businessRules, acceptanceCriteria }
    → Use Case        UC-N: pasos referenciando #N
    → Test (rojo)     describe('Element #N', () => { it('should...') })
    → Código (verde)  class ElementN extends HTMLElement { ... }
    → HTML            <button data-element-id="N">
```

!!! tip "Invariante"
    Ningún elemento puede aparecer en una fase posterior si no estaba numerado en el boceto.
    Zero ambigüedad por diseño.

## Pipeline: 10 agentes especializados

Flujo: `0 → (1 ∥ 2) → 3 → 4 → GATE → 5 → 6 → 7 → 8 → 9`

Los agentes 1 y 2 se ejecutan en paralelo.

=== "Agente 0 — Boceto Parser"
    **:white_check_mark: Implementado** · `/boceto-parser`

    Escanea todos los ficheros HTML del boceto, extrae cada `data-element-id` y genera
    el índice estructural y el registro descriptivo de elementos.

    | | |
    |--|--|
    | **INPUT** | `01-boceto/html-source-prototype/*.html` |
    | **OUTPUT** | `01-boceto/boceto-metadata.json` · `01-boceto/html-source-prototype/boceto-elements.md` |

=== "Agente 1 ∥ — Diseñador Front"
    **:white_check_mark: Implementado** · `/designer-front` · **:white_check_mark: Ejecutado** — `ui-spec.json` generado · 12 pantallas · 122 elementos

    Especifica cada elemento UI: tipo, props, estados, interacciones, validaciones y
    accesibilidad por sketchNumber.

    | | |
    |--|--|
    | **INPUT** | `boceto-metadata.json` · `boceto-elements.md` · `html-source-prototype/*.html` |
    | **OUTPUT** | `03-generated-artifacts/ui-spec.json` · phase: `ui-spec` |

=== "Agente 2 ∥ — Analista de Negocio"
    **:white_check_mark: Implementado** · `/business-analyst` · **:white_check_mark: Ejecutado** — `transcripcion.md` completada · 122 elementos cubiertos · 5 propuestas en `boceto-suggestions.md`

    Entrevista al cliente y completa `transcripcion.md` hasta cubrir todos los elementos
    del boceto. Propone cambios en el boceto cuando detecta gaps.

    | | |
    |--|--|
    | **INPUT** | `boceto-elements.md` · `html-source-prototype/*.html` · entrevista inicial |
    | **OUTPUT** | `02-conversacion-cliente/transcripcion.md` · `boceto-suggestions.md` |

=== "Agente 3 — Validador de Alineación"
    **:white_check_mark: Implementado** · `/alignment-validator` · **:white_check_mark: Ejecutado — PASS** — `valid: true` · los tres checks superados

    Gate 3-way: verifica que boceto ↔ entrevista ↔ schema son consistentes entre sí
    antes de generar ninguna especificación. Si falla, el pipeline se detiene.

    | | |
    |--|--|
    | **INPUT** | `boceto-metadata.json` · `ui-spec.json` · `transcripcion.md` · `schema.sql` |
    | **OUTPUT** | `03-generated-artifacts/alignment-report.json` *(local — no RAG)* |

=== "Agente 4 — Generador Func. Spec"
    **:white_check_mark: Implementado** · `/generate-functional-spec`

    Convierte `transcripcion.md` + `ui-spec.json` en una especificación funcional
    estructurada con `behavior`, `businessRules` y `acceptanceCriteria` por sketchNumber.

    | | |
    |--|--|
    | **INPUT** | `transcripcion.md` · `ui-spec.json` · `alignment-report.json` |
    | **OUTPUT** | `03-generated-artifacts/functional-spec.json` · phase: `func-spec` |

=== "GATE HUMANO — Reconciliación"
    !!! danger "Punto de control humano"
        Verifica que cada sketchNumber del boceto tiene su entrada en `functional-spec.json`
        y viceversa. Sin elementos huérfanos en ningún lado. Requiere aprobación manual
        antes de continuar.

    | | |
    |--|--|
    | **INPUT** | `ui-spec.json` · `functional-spec.json` |
    | **OUTPUT** | `03-generated-artifacts/reconciliation.json { valid: true }` *(local — no RAG)* |

=== "Agente 5 — Arquitecto de Requisitos"
    **:white_check_mark: Implementado** · `/requirement-architect`

    Con las specs validadas y el schema como entrada, genera los casos de uso y los
    contratos de API REST.

    | | |
    |--|--|
    | **INPUT** | `functional-spec.json` · `ui-spec.json` · `reconciliation.json` · `schema.sql` · `boceto-metadata.json` |
    | **OUTPUT** | `04-use-cases/use-cases.md` · `backend/api-contracts.md` · phase: `use-case` |

=== "Agente 6 — Ingeniero TDD"
    **:white_check_mark: Implementado** · `/tdd-engineer`

    Deriva tests unitarios en rojo de los `acceptanceCriteria`. Cada `describe()` referencia
    un sketchNumber. Los tests deben fallar antes de que exista implementación.

    | | |
    |--|--|
    | **INPUT** | `functional-spec.json` · `use-cases.md` · `alignment-report.json` · `api-contracts.md` · `schema.sql` |
    | **OUTPUT** | `*/tests/*.test.ts` *(rojo ✗)* · phase: `test-red` |

=== "Agente 7 — Implementador"
    **:white_check_mark: Implementado** · `/implementer`

    Escribe el código mínimo para que todos los tests pasen. Backend Bun + Express +
    TypeScript. Frontend Web Components + TypeScript compilado con `bun build`.

    | | |
    |--|--|
    | **INPUT** | `*/tests/*.test.ts` · `use-cases.md` · `api-contracts.md` · `schema.sql` · `ui-spec.json` · `functional-spec.json` |
    | **OUTPUT** | `backend/src/` · `frontend/src/` · phase: `code` |

=== "Agente 8 — Ingeniero E2E"
    **:white_check_mark: Implementado** · `/e2e-engineer`

    Genera tests Cypress e2e a partir de los casos de uso — un fichero por UC cubriendo
    flujo principal y alternativo crítico. Usa `data-element-id` como selector.

    | | |
    |--|--|
    | **INPUT** | `use-cases.md` · `ui-spec.json` · `functional-spec.json` · `api-contracts.md` |
    | **OUTPUT** | `cypress/e2e/*.cy.ts` · phase: `e2e` |

=== "Agente 9 — Revisor / QA"
    **:white_check_mark: Implementado** · `/reviewer`

    Audita cumplimiento SOLID completo en tests e implementación. Si detecta violaciones,
    identifica al agente responsable y lo re-ejecuta hasta que el código pase la auditoría.
    Bloquea el avance al merge/despliegue mientras haya violaciones pendientes.

    | | |
    |--|--|
    | **INPUT** | implementación completa · `*/tests/*.test.ts` · `cypress/e2e/*.cy.ts` · `docs/solid.md` |
    | **OUTPUT** | `review-report.md` (PASS ✅ / FAIL ❌ + bucle de corrección) · phase: `review` |

### Agentes bajo demanda

| Agente | Comando | Cuándo usarlo |
|--------|---------|---------------|
| **Migration Generator** | `/migration-generator` | Cuando `schema.sql` cambia entre iteraciones |
| **CI Setup** | `/ci-setup` | Primera vez o cambio de stack |
| **Doc Reviewer** | `/doc-reviewer` | En cualquier momento |

## Capa RAG: PostgreSQL + pgvector

Cada artefacto generado se valida con un **Zod schema** y se persiste en la tabla
`knowledge_base`. Los agentes recuperan contexto mediante búsqueda híbrida: similaridad
vectorial + filtros estructurados.

| Columna | Tipo | Descripción |
|---------|------|-------------|
| `id` | UUID | Clave primaria |
| `content` | TEXT | Artefacto JSON serializado |
| `embedding` | vector(1536) | OpenAI `text-embedding-3-small` · índice HNSW |
| `phase` | VARCHAR | `boceto-parse` · `ui-spec` · `interview` · `func-spec` · `use-case` · `test-red` · `e2e` · `code` · `review` |
| `sketch_number` | INT \| NULL | Clave de trazabilidad. `NULL` para artefactos no acotados a un elemento |
| `feature_id` | TEXT | Identificador de funcionalidad (ej. `corrector-v1`) |
| `agent` | TEXT | Agente que generó la fila |
| `version` | INT | Versión incremental del artefacto |

### Schemas Zod clave

| Schema | Campos principales |
|--------|------------------|
| `UISpecSchema` | `screens[].components[]` con `sketchNumber`, `type` (32 valores), `props`, `states[]`, `interactions[]`, `accessibility`, `validation[]`, `depends_on[]` |
| `FunctionalSpecSchema` | `elementSpecs[]` con `sketchNumber`, `behavior`, `businessRules`, `acceptanceCriteria`; más `globalRules[]` |
| `ReconciliationSchema` | `valid`, `boceto_numbers`, `spec_numbers`, `orphaned_sketch_elements`, `orphaned_spec_rules` |
| `AlignmentReportSchema` | `valid`, `checks[]` con `type`, `status` (`pass` \| `fail`), `issues[]` |

!!! note
    `boceto-suggestions.md` (output del Agente 2) es Markdown — sin schema Zod.

## Principios de diseño

Todo el código generado por los agentes sigue los **principios SOLID**:
Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation
y Dependency Inversion. Consulta la guía completa con ejemplos TypeScript adaptados
a este proyecto en [Principios SOLID](solid.md).

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| LLM / Agentes | Claude API (`claude-sonnet-4-6`) |
| Embeddings | OpenAI `text-embedding-3-small` |
| Base de datos RAG | PostgreSQL 16 + pgvector 0.7 |
| Backend | Bun + Express + TypeScript |
| Validación de schema | Zod 3.x |
| Frontend | Web Components nativos + lit-html standalone + Tailwind CSS 3.x + TypeScript |
| Build frontend | `bun build` — `src/frontend/*.ts` → `dist/frontend/*.js` → `<script type="module">` |
| Tests unitarios | `bun test` (API compatible con Jest) |
| Tests funcionales / e2e | Cypress |
| Documentación | MkDocs + Material for MkDocs → GitHub Pages |
| Calidad de código | SonarCloud (análisis estático + cobertura) |
| CI/CD | GitHub Actions |

## Frontend: Web Components nativos

Cada componente UI es un **Custom Element nativo** cargado directamente como ES Module.
No hay bundler, no hay transpilación, no hay framework. El template engine es
[lit-html standalone](https://lit.dev/docs/libraries/standalone-templates/).

### Anatomía de un componente

```ts
// corrector-rubrica-cell.ts
import { html, render } from 'lit-html';

export class CorrectorRubricaCell extends HTMLElement {
  private _disposables: Array<() => void> = [];

  connectedCallback(): void {
    this.attachShadow({ mode: 'open' });
    this._render();

    const onSelect = (): void => this._handleSelect();
    this.shadowRoot!.addEventListener('click', onSelect);
    this._disposables.push(
      () => this.shadowRoot!.removeEventListener('click', onSelect)
    );
  }

  disconnectedCallback(): void {
    this._disposables.forEach(fn => fn());
    this._disposables = [];
  }

  private _handleSelect(): void {
    this.dispatchEvent(new CustomEvent('corrector:grade-selected', {
      bubbles: true,
      composed: true,
      detail: { level: this.getAttribute('level'), value: Number(this.getAttribute('value')) },
    }));
  }

  private _render(): void {
    const level    = this.getAttribute('level') ?? '';
    const value    = this.getAttribute('value') ?? '0';
    const selected = this.hasAttribute('selected');

    render(html`
      <td
        .title=${`Nivel: ${level}`}
        @click=${(): void => this._handleSelect()}
        ?aria-selected=${selected}
      >
        ${value}
      </td>
    `, this.shadowRoot!);
  }
}

customElements.define('corrector-rubrica-cell', CorrectorRubricaCell);
```

### Reglas del sistema de componentes

| Regla | Detalle |
|-------|---------|
| **Nombre** | Prefijo `corrector-*`, guión obligatorio, registrado con `customElements.define` |
| **Shadow DOM** | `if (!this.shadowRoot) this.attachShadow({ mode: 'open' })` en `connectedCallback` |
| **Renderizado** | `html` + `render` de lit-html. Nunca `innerHTML` directo. |
| **Bindings** | `.prop` (propiedad), `@event` (listener), `?attr` (atributo booleano), `repeat` o `map` (listas) |
| **Lifecycle** | `connectedCallback`: setup + render + suscribir. `disconnectedCallback`: vaciar disposables. |
| **Disposables** | Cada `addEventListener` / observer / intervalo añade su cleanup a `this._disposables[]` |
| **Comunicación** | `CustomEvent` con `bubbles: true` y `composed: true`. Los eventos cruzan Shadow DOM boundaries. |
| **Módulos** | `export class` en fichero propio. Cargado con `<script type="module">`. Sin bundler. |

### Convención de nombres

| Artefacto | Patrón | Ejemplo |
|-----------|--------|---------|
| Fichero | `kebab-case.ts` | `corrector-rubrica-cell.ts` |
| Clase | `PascalCase` | `CorrectorRubricaCell` |
| Elemento | `corrector-*` | `corrector-rubrica-cell` |
| Evento | `corrector:verbo-sustantivo` | `corrector:grade-selected` |

## Calidad de código — SonarCloud

El análisis estático continuo corre automáticamente en cada push y PR mediante
**SonarCloud** ✅ (activo desde 2026-06-06). Detecta bugs, vulnerabilidades de
seguridad, code smells y mide cobertura de tests.

- Dashboard: [sonarcloud.io/project/overview?id=dbetancorfp_CORRECTOR_DE_PROYECTOS](https://sonarcloud.io/project/overview?id=dbetancorfp_CORRECTOR_DE_PROYECTOS)
- Guía completa: [SonarCloud](sonarcloud.md)

El Quality Gate debe estar en ✅ antes de mergear cualquier PR.

## Gestión de tareas

Las tareas del proyecto se gestionan exclusivamente mediante
**[Issues de GitHub](https://github.com/dbetancorfp/CORRECTOR_DE_PROYECTOS/issues)**.
Cada Issue representa una unidad de trabajo trazable: nueva funcionalidad, corrección,
tarea de pipeline o violación de calidad detectada por el Agente 9.

!!! tip "Regla de trazabilidad"
    Cualquier cambio al código o a la documentación que no sea trivial debe referenciar
    su Issue de origen en el mensaje de commit: `fix: corregir cálculo de nota (#42)`.

## Workflow CLI

```bash
# ── Agente 0: parsear boceto ──────────────────────────────────────
/boceto-parser

# ── Agentes 1 ∥ 2: UI spec + entrevista (paralelo) ───────────────
/designer-front
/business-analyst

# ── Agente 3: validación 3-way ───────────────────────────────────
/alignment-validator

# ── Agente 4: especificación funcional ───────────────────────────
/generate-functional-spec

# ── GATE HUMANO: reconciliación ──────────────────────────────────
bun cli/index.js reconcile --feature-id "corrector-v1"

# ── Agente 5: casos de uso + contratos API ────────────────────────
/requirement-architect

# ── Agente 6: tests TDD (deben fallar) ───────────────────────────
/tdd-engineer
bun test                                   # RED ✗

# ── Agente 7: implementación ─────────────────────────────────────
/implementer
bun test                                   # GREEN ✅

# ── Agente 8: tests e2e ──────────────────────────────────────────
/reviewer                                  # audita 6+7, re-ejecuta si falla

# ── Agente 8: tests e2e ────────────────────────────
/e2e-engineer
bunx cypress run

# ── Publicar documentación ───────────────────────────────────────
git push main                              # → GitHub Pages (CI/CD)
```

## Estructura del repositorio

```
CORRECTOR_DE_PROYECTOS/
├── corrector/               # Workspace del pipeline — proyecto real (corrector-v1)
│   ├── 01-boceto/
│   │   ├── boceto-metadata.json    # Agente 0 output · entrada Agente 1
│   │   └── html-source-prototype/  # Bocetos HTML anotados (122 elementos, 12 pantallas)
│   │       └── boceto-elements.md  # Agente 0 output — registro descriptivo de elementos
│   ├── 02-conversacion-cliente/
│   │   ├── transcripcion.md        # Agente 2 output — entrevista completa
│   │   └── boceto-suggestions.md   # Agente 2 output — cambios propuestos en boceto
│   ├── 03-generated-artifacts/     # ui-spec.json · functional-spec.json · reconciliation.json · alignment-report.json
│   ├── 04-use-cases/               # use-cases.md (Agente 5 output)
│   └── 05-implementation/
│       ├── backend/                # schema.sql · api-contracts.md · migrations/ · src/ · tests/
│       ├── frontend/               # src/ · dist/ · tests/
│       └── cypress/e2e/            # Agente 8 output — Cypress e2e tests
├── lib/
│   ├── agents/              # Un subdirectorio por agente
│   │   ├── boceto-parser/         # boceto-parser.md
│   │   ├── designer-front/        # designer-front.md · designer-front.js
│   │   ├── business-analyst/      # business-analyst.md · business-analyst.js
│   │   ├── alignment-validator/   # alignment-validator.md
│   │   ├── generate-functional-spec/ # generate-functional-spec.md
│   │   ├── requirement-architect/ # requirement-architect.md · requirement-architect.js
│   │   ├── tdd-engineer/          # tdd-engineer.md · tdd-engineer.js
│   │   ├── implementer/           # implementer.md · implementer.js
│   │   ├── e2e-engineer/          # e2e-engineer.md
│   │   ├── ci-setup/              # ci-setup.md
│   │   ├── doc-reviewer/          # doc-reviewer.md
│   │   ├── migration-generator/   # migration-generator.md
│   │   ├── reviewer/              # reviewer.md
│   │   ├── index.js               # Barrel de exports
│   │   └── validator.js           # Utilidad compartida
│   ├── schemas/             # Zod schemas
│   ├── tools/               # claude-client · rag-client · artifact-manager
│   └── orchestrator/        # State machine del pipeline
├── cli/commands/            # run-agent · commit · reconcile · validate
├── .claude/commands/        # Slash command entry points (.md)
├── docs/                    # Esta documentación (fuente MkDocs)
├── mkdocs.yml               # Configuración MkDocs + Material
└── .github/workflows/       # CI: ci.yml · e2e.yml · deploy-docs.yml
```
