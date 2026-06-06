# Pipeline — Flujo de creación

Visualización del flujo completo de artefactos, desde el boceto hasta el código desplegable.

## Diagrama del pipeline

```mermaid
flowchart TD
    CLAUDE["⚙️ CLAUDE.md\nConfig global"]
    BOCETO["🎨 Boceto HTML\n90 elementos · 11 pantallas"]
    TRANS_IN["📝 transcripcion.md\nEntrevista inicial"]
    SCHEMA["🗄️ schema.sql\nPostgreSQL 16 DDL"]

    A0["**0** Boceto Parser\n/boceto-parser"]
    A1["**1∥** Diseñador Front\n/designer-front"]
    A2["**2∥** Analista de Negocio\n/business-analyst"]
    A3["**3** Validador Alineación\n/alignment-validator"]
    A4["**4** Generador Func. Spec\n/generate-functional-spec"]
    GATE["🚪 GATE HUMANO\nReconciliación"]
    A5["**5** Arquitecto de Requisitos\n/requirement-architect"]
    A6["**6** Ingeniero TDD\n/tdd-engineer"]
    A7["**7** Implementador\n/implementer"]
    A8["**8** Ingeniero E2E\n/e2e-engineer"]
    A9["**9** Revisor QA\n(opcional)"]

    META["boceto-metadata.json\nboceto-elements.md"]
    UISPEC["ui-spec.json"]
    TRANS_OUT["transcripcion.md\nboceto-suggestions.md"]
    ALIGN["alignment-report.json\n(local — no RAG)"]
    FSPEC["functional-spec.json"]
    RECON["reconciliation.json\n(local — no RAG)"]
    UC["use-cases.md\napi-contracts.md"]
    TESTS["*.test.ts\n(RED ✗)"]
    CODE["backend/src/\nfrontend/src/"]
    E2E["cypress/e2e/*.cy.ts"]

    CLAUDE --> A0
    BOCETO --> A0
    A0 --> META
    META --> A1
    BOCETO --> A1
    META --> A2
    BOCETO --> A2
    TRANS_IN --> A2
    A1 --> UISPEC
    A2 --> TRANS_OUT
    META --> A3
    UISPEC --> A3
    TRANS_OUT --> A3
    SCHEMA --> A3
    A3 --> ALIGN
    TRANS_OUT --> A4
    UISPEC --> A4
    ALIGN --> A4
    A4 --> FSPEC
    FSPEC --> GATE
    UISPEC --> GATE
    GATE --> RECON
    FSPEC --> A5
    UISPEC --> A5
    RECON --> A5
    SCHEMA --> A5
    META --> A5
    A5 --> UC
    FSPEC --> A6
    UC --> A6
    ALIGN --> A6
    SCHEMA --> A6
    A6 --> TESTS
    TESTS --> A7
    UC --> A7
    SCHEMA --> A7
    UISPEC --> A7
    FSPEC --> A7
    A7 --> CODE
    UC --> A8
    UISPEC --> A8
    FSPEC --> A8
    A8 --> E2E
    CODE --> A9
    TESTS --> A9
    E2E --> A9

    style GATE fill:#fee2e2,stroke:#dc2626,color:#991b1b
    style A3 fill:#fef3c7,stroke:#d97706
    style SCHEMA fill:#fce7f3,stroke:#9d174d,color:#9d174d
    style ALIGN fill:#f3f4f6,stroke:#9ca3af
    style RECON fill:#f3f4f6,stroke:#9ca3af
```

## Artefactos por fase

### Entradas humanas

| Artefacto | Ruta | Descripción |
|-----------|------|-------------|
| `CLAUDE.md` | `/CLAUDE.md` | Configuración global del proyecto y del pipeline |
| Boceto HTML | `corrector/01-boceto/html-source-prototype/` | 11 pantallas · 90 elementos con `data-element-id` |
| Entrevista inicial | `corrector/02-conversacion-cliente/transcripcion.md` | Transcripción parcial (entrada al Agente 2) |
| `schema.sql` | `corrector/05-implementation/backend/schema.sql` | DDL PostgreSQL 16 — fuente de verdad del modelo de datos |

### Fase 0 — Boceto Parse

| Artefacto | Ruta | RAG |
|-----------|------|-----|
| `boceto-metadata.json` | `corrector/01-boceto/` | ✅ phase: `boceto-parse` |
| `boceto-elements.md` | `corrector/01-boceto/` | ✅ phase: `boceto-parse` |

### Fase 1 ∥ — UI Spec

| Artefacto | Ruta | RAG |
|-----------|------|-----|
| `ui-spec.json` | `corrector/03-generated-artifacts/` | ✅ phase: `ui-spec` |

### Fase 2 ∥ — Interview

| Artefacto | Ruta | RAG |
|-----------|------|-----|
| `transcripcion.md` *(completa)* | `corrector/02-conversacion-cliente/` | ✅ phase: `interview` |
| `boceto-suggestions.md` | `corrector/02-conversacion-cliente/` | ❌ Solo lectura humana |

### Fase 3 — Alignment Gate

| Artefacto | Ruta | RAG |
|-----------|------|-----|
| `alignment-report.json` | `corrector/03-generated-artifacts/` | ❌ Solo local |

### Fase 4 — Functional Spec

| Artefacto | Ruta | RAG |
|-----------|------|-----|
| `functional-spec.json` | `corrector/03-generated-artifacts/` | ✅ phase: `func-spec` |

### GATE HUMANO

| Artefacto | Ruta | RAG |
|-----------|------|-----|
| `reconciliation.json` | `corrector/03-generated-artifacts/` | ❌ Solo local |

### Fase 5 — Use Cases & API

| Artefacto | Ruta | RAG |
|-----------|------|-----|
| `use-cases.md` | `corrector/04-use-cases/` | ✅ phase: `use-case` |
| `api-contracts.md` | `corrector/05-implementation/backend/` | ✅ phase: `use-case` |

### Fase 6 — TDD (Red)

| Artefacto | Ruta | RAG |
|-----------|------|-----|
| `backend/tests/*.test.ts` | `corrector/05-implementation/` | ✅ phase: `test-red` |
| `frontend/tests/*.test.ts` | `corrector/05-implementation/` | ✅ phase: `test-red` |

### Fase 7 — Implementación

| Artefacto | Ruta | RAG |
|-----------|------|-----|
| `backend/src/` | `corrector/05-implementation/` | ✅ phase: `code` |
| `frontend/src/` | `corrector/05-implementation/` | ✅ phase: `code` |

### Fase 8 — E2E

| Artefacto | Ruta | RAG |
|-----------|------|-----|
| `cypress/e2e/*.cy.ts` | `corrector/05-implementation/` | ✅ phase: `e2e` |

## Roles de los agentes del pipeline

| # | Agente | Slash command | Estado |
|---|--------|--------------|--------|
| 0 | Boceto Parser | `/boceto-parser` | ✅ |
| 1 ∥ | Diseñador Front | `/designer-front` | ✅ |
| 2 ∥ | Analista de Negocio | `/business-analyst` | ✅ |
| 3 | Validador de Alineación | `/alignment-validator` | ✅ |
| 4 | Generador Func. Spec | `/generate-functional-spec` | ✅ |
| — | **GATE HUMANO** | `bun cli/index.js reconcile` | Manual |
| 5 | Arquitecto de Requisitos | `/requirement-architect` | ✅ |
| 6 | Ingeniero TDD | `/tdd-engineer` | ✅ |
| 7 | Implementador | `/implementer` | ✅ |
| 8 | Ingeniero E2E | `/e2e-engineer` | ✅ |
| 9 | Revisor / QA | *(pendiente)* | ❌ |
| ★ | Migration Generator | `/migration-generator` | ✅ |
| ★ | CI Setup | `/ci-setup` | ✅ |

## Protocolo de re-entrada

Cuando el boceto cambia después de una iteración:

1. Editar los `.html` afectados manualmente
2. `/boceto-parser` — regenera `boceto-metadata.json` + `boceto-elements.md`
3. `/designer-front` — regenera `ui-spec.json`
4. Reanudar desde el **Agente 3** (Validador de Alineación)

!!! tip "Regla de re-entrada"
    El **Agente 3** es siempre el punto de re-entrada después de cualquier cambio
    en las tres entradas originales (boceto · entrevista · schema).
