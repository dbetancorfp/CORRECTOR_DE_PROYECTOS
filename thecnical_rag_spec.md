# RAG Spec-Driven Development - Resumen Técnico

Autor: David (Profesor FP, IES Telesforo Bravo)  
Fecha: Mayo 2024  
Stack: Node.js + PostgreSQL + pgvector + Claude API + GitHub Pages

---

## 1. Visión General

Sistema multi-agente que convierte dos entradas heterogéneas (boceto visual numerado + conversación del cliente) en una aplicación completa (backend Node + frontend Web Components OO + Tailwind) con trazabilidad total desde requisito hasta código.

Principio central: El número del boceto (sketchNumber) es la clave foránea que vincula visual → funcional → test → código. No hay ambigüedad.

---

## 2. Arquitectura de Alto Nivel

`
┌─────────────────────────────────────────────────────────────────┐
│                         ENTRADA (Humano)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Boceto Numerado          Conversación Cliente                 │
│  (imagen + metadata)      (texto + referencias a #)            │
│      ↓                              ↓                          │
│  boceto.png          "App para tareas. Elemento #7:           │
│  boceto-metadata.json valida email antes de..."               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    CAPA 1: RAG (pgvector)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  knowledge_base (Postgres)                                      │
│  ├─ id (UUID)                                                   │
│  ├─ content (TEXT)                                              │
│  ├─ embedding (vector[1536])  ← HNSW index                     │
│  ├─ phase ('ui-spec' | 'func-spec' | 'use-case' | ...)        │
│  ├─ feature_id (TEXT)                                           │
│  ├─ agent (TEXT)                                                │
│  ├─ sketch_number (INT)     ← CLAVE DE TRAZABILIDAD            │
│  ├─ version (INT)                                               │
│  └─ created_at (TIMESTAMP)                                      │
│                                                                 │
│  Búsqueda: Vector + Filtros estructurados (hibrida)            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│             CAPA 2: AGENTES ESPECIALIZADOS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Agente 1: Diseñador de Front                            │  │
│  │ Input: boceto.png + boceto-metadata.json                │  │
│  │ Output: UI Spec JSON (componentes, states, eventos)     │  │
│  │         element-mapping.json (sketchNumber → DOM)       │  │
│  │         HTML+Tailwind validable                         │  │
│  │ Validación: UISpecSchema (Zod)                          │  │
│  │ Handoff: Persiste en RAG con phase='ui-spec'           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Agente 2: Analista de Negocio                           │  │
│  │ Input: conversación cliente + UI Spec (RAG)             │  │
│  │ Output: Functional Spec JSON                            │  │
│  │         - elementSpecs[] { sketchNumber, behavior,      │  │
│  │                            businessRules[], ...criteria }│  │
│  │         - globalRules[] (lógica no-visual)              │  │
│  │ Validación: FunctionalSpecSchema (Zod)                  │  │
│  │ Handoff: Persiste en RAG con phase='func-spec'         │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ GATE HUMANO: Reconciliación                             │  │
│  │ ✓ ¿Todo sketch_number en boceto tiene func-spec?        │  │
│  │ ✓ ¿Todo sketch_number en func-spec existe en boceto?    │  │
│  │ ✓ ¿Completitud: cero elementos huérfanos?               │  │
│  │ Salida: reconciliation.json { valid: true, ... }        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Agente 3: Arquitecto de Requisitos                      │  │
│  │ Input: Specs validadas + reconciliation OK               │  │
│  │ Output: Casos de uso (UC)                               │  │
│  │         Esquema Postgres (DDL)                          │  │
│  │         Contratos API (OpenAPI-like)                    │  │
│  │ Derivación: acceptanceCriteria → test cases              │  │
│  │ Handoff: Persiste en RAG con phase='use-case'          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Agente 4: Ingeniero TDD                                 │  │
│  │ Input: Casos de uso + Criterios de aceptación (RAG)     │  │
│  │ Output: Tests ROJO (fallando)                           │  │
│  │         - Backend: Vitest + node-fetch                  │  │
│  │         - Frontend: @web/test-runner (Web Components)   │  │
│  │ Trazabilidad: Cada test.describe() → sketchNumber        │  │
│  │ Handoff: Persiste tests en RAG con phase='test-red'    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Agente 5: Implementador                                 │  │
│  │ Input: Tests rojos + contratos API + esquema Postgres   │  │
│  │ Output: Código (tests VERDE)                            │  │
│  │         - Backend: Node.js/Express + Postgres           │  │
│  │         - Frontend: Web Components OO + Tailwind        │  │
│  │ Scope: Codifica solo lo suficiente para verde           │  │
│  │ Handoff: Persiste código en RAG con phase='code'       │  │
│  └──────────────────────────────────────────────────────────┘  │
│                              ↓                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Agente 6: Revisor/QA (opcional)                         │  │
│  │ Input: Código + tests verdes                            │  │
│  │ Output: Refactoring sugerido, validación de OO          │  │
│  │ Validación: ¿Sigue convenciones? ¿No hay dead code?    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  CAPA 3: CÓDIGO EJECUTABLE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Backend                   Frontend                            │
│  ├─ src/routes/            ├─ components/                      │
│  ├─ src/services/          ├─ tests/                           │
│  ├─ src/models/            └─ index.html (+ Tailwind)          │
│  ├─ tests/                                                      │
│  └─ schema.sql             Nginx + PostgreSQL                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│               CAPA 4: DOCUMENTACIÓN + PUBLICACIÓN               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  VitePress + GitHub Pages                                      │
│  ├─ docs/guide/  (arquitectura, workflow, roles)               │
│  ├─ docs/examples/  (casos de uso completos)                   │
│  ├─ docs/api-reference/  (generado desde artefactos)           │
│  └─ Public: GitHub Pages en main branch                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

---

## 3. Flujo de Datos: El Handoff

Cada handoff sigue este patrón:

┌─────────────────────────────────────┐
│ Agente N genera artefacto X         │
└────────────────┬────────────────────┘
                 ↓
        ┌────────────────────┐
        │ Validar schema     │
        │ contra Zod Schema  │
        └────────┬───────────┘
                 ↓
        ┌────────────────────┐
        │ ¿Válido?           │
        └────┬──────────┬────┘
             │ NO       │ SÍ
             ↓         ↓
        [ERROR]   ┌─────────────────────┐
                  │ Persist en RAG:     │
                  │ INSERT knowledge_base│
                  │ - content           │
                  │ - embedding         │
                  │ - phase             │
                  │ - feature_id        │
                  │ - sketch_number     │
                  │ - agent             │
                  │ - version           │
                  └────────┬────────────┘
                           ↓
                  ┌────────────────────┐
                  │ Agente N+1         │
                  │ busca en RAG:      │
                  │ - filtro: phase    │
                  │ - filtro: feature  │
                  │ - vector search    │
                  │   para contexto    │
                  └────────┬───────────┘
                           ↓
                     [SIGUIENTE FASE]

---

## 4. La Clave: sketchNumber

Boceto (diseño)                   Conversación (cliente)
       │                                  │
       ├─ Elemento #1: Nav               ├─ "Elem #1 muestra secciones"
       ├─ Elemento #7: Botón Submit      ├─ "Elem #7 valida email"
       └─ Elemento #9: Modal             └─ "Elem #9 abre confirmación"
       │                                  │
       └──────────────┬────────────────────┘
                      ↓
            ┌─────────────────────┐
            │ UI Spec             │
            │ {                   │
            │   sketchNumber: 1,  │
            │   type: "nav",      │
            │   ...              │
            │ }                   │
            └────────┬────────────┘
                     ↓
            ┌─────────────────────┐
            │ Functional Spec     │
            │ {                   │
            │   sketchNumber: 1,  │
            │   behavior: "...",  │
            │   ...              │
            │ }                   │
            └────────┬────────────┘
                     ↓
            ┌─────────────────────┐
            │ Use Case            │
            │ UC1: [elemento #1]  │
            │ 1. Usuario navega   │
            │    a Nav (#1)       │
            │ ...                 │
            └────────┬────────────┘
                     ↓
            ┌─────────────────────┐
            │ Test (rojo)         │
            │ describe('Nav #1')  │
            │ it('should...')     │
            │ ...                 │
            └────────┬────────────┘
                     ↓
            ┌─────────────────────┐
            │ Código (verde)      │
            │ // Elemento #1      │
            │ class Navigation {  │
            │   ...              │
            │ }                   │
            └────────┬────────────┘
                     ↓
            ┌─────────────────────┐
            │ HTML (atributo)     │
            │ <nav data-element   │
            │      -id="1">       │
            └─────────────────────┘

---

## 5. Estructura del Repositorio

proyecto-rag-spec-driven/
│
├── README.md                          # Punto de entrada
├── TECHNICAL_SUMMARY.md               # Este archivo
├── .nojekyll                          # GitHub Pages: no Jekyll
│
├── package.json                       # npm: VitePress + Zod + cli
├── vitepress.config.mjs               # Config docs
│
├── docs/                              # FUENTE de documentación
│   ├── index.md                       # Landing page
│   ├── .vitepress/
│   │   └── config.mjs
│   ├── guide/
│   │   ├── 01-arquitectura.md
│   │   ├── 02-workflow.md
│   │   ├── 03-agent-roles.md
│   │   ├── 04-rag-schema.md
│   │   ├── 05-frontend-design.md
│   │   ├── 06-api-contracts.md
│   │   └── 07-tdd-traceability.md
│   ├── examples/
│   │   ├── index.md
│   │   ├── example-app-1.md
│   │   └── example-app-2.md
│   ├── api-reference/
│   │   ├── agents.md
│   │   ├── schemas.md
│   │   ├── rag-client.md
│   │   └── cli-commands.md
│   └── public/
│       ├── architecture.svg
│       └── example-app-1/
│           ├── boceto.png
│           └── screenshots/
│
├── lib/                               # CÓDIGO EJECUTABLE
│   ├── agents/
│   │   ├── index.js
│   │   ├── designer-front.js          # Agente 1
│   │   ├── business-analyst.js        # Agente 2
│   │   ├── requirement-architect.js   # Agente 3
│   │   ├── tdd-engineer.js            # Agente 4
│   │   ├── implementer.js             # Agente 5
│   │   └── validator.js               # Agente 6 (opcional)
│   │
│   ├── schemas/                       # Zod schemas
│   │   ├── ui-spec.schema.js
│   │   ├── functional-spec.schema.js
│   │   ├── element-mapping.schema.js
│   │   └── reconciliation.schema.js
│   │
│   ├── tools/
│   │   ├── claude-client.js           # Abstracción Claude API
│   │   ├── rag-client.js              # Pgvector + búsqueda
│   │   ├── artifact-manager.js        # CRUD knowledge_base
│   │   ├── sketch-parser.js           # Extrae números
│   │   ├── element-mapper.js          # sketchNumber → DOM
│   │   ├── test-generator.js          # Criteria → tests
│   │   └── handoff-validator.js       # Valida esquemas
│   │
│   └── orchestrator/
│       ├── index.js                   # State machine del flujo
│       └── pipeline.js
│
├── cli/
│   ├── index.js                       # Punto de entrada CLI
│   └── commands/
│       ├── create-project.js
│       ├── run-agent.js
│       ├── validate.js
│       ├── reconcile.js
│       └── generate-docs.js
│
├── examples/
│   ├── example-app-1/
│   │   ├── README.md
│   │   ├── 01-boceto/
│   │   │   ├── boceto.png
│   │   │   └── boceto-metadata.json
│   │   ├── 02-conversacion-cliente/
│   │   │   └── transcripcion.md
│   │   ├── 03-generated-artifacts/
│   │   │   ├── ui-spec.json
│   │   │   ├── functional-spec.json
│   │   │   ├── element-mapping.json
│   │   │   └── reconciliation.json
│   │   ├── 04-use-cases/
│   │   │   └── use-cases.md
│   │   ├── 05-implementation/
│   │   │   ├── backend/
│   │   │   │   ├── src/
│   │   │   │   ├── tests/
│   │   │   │   └── schema.sql
│   │   │   ├── frontend/
│   │   │   │   ├── index.html
│   │   │   │   ├── components/
│   │   │   │   └── tests/
│   │   │   └── api-contracts.md
│   │   └── project-log.md
│   └── example-app-2/
│
├── .github/
│   ├── workflows/
│   │   ├── validate-artifacts.yml     # CI: valida specs
│   │   ├── deploy-docs.yml            # Deploy a Pages
│   │   └── test-coverage.yml          # Tests
│   └── ISSUE_TEMPLATE/
│       ├── new-project.md
│       └── feature-request.md
│
├── tests/
│   ├── schemas.test.js
│   ├── rag-client.test.js
│   ├── reconciliation.test.js
│   └── handoff.test.js
│
├── dist/                              # GENERADO por VitePress
│   └── (no commitear)
│
└── LICENSE (MIT)

---

## 6. Schemas Zod (Estructura de Datos)

### 6.1 UI Spec Schema

```javascript
// lib/schemas/ui-spec.schema.js

export const UISpecSchema = z.object({
  screens: z.array(z.object({
    id: z.string(),
    name: z.string(),
    route: z.string(),
    components: z.array(z.object({
      sketchNumber: z.number(),        // ← CLAVE TRAZABILIDAD
      type: z.enum(['button', 'input', 'nav', 'list', 'card', 'modal']),
      props: z.record(z.unknown()),
      states: z.array(z.string()),     // 'loading', 'error', 'empty'
      interactions: z.array(z.object({
        event: z.string(),              // 'onClick', 'onSubmit'
        action: z.string(),
        linkedRequirement: z.string().optional()
      }))
    })),
    dataNeeds: z.array(z.string())     // → contratos API
  }))
});
```

### 6.2 Functional Spec Schema

```javascript
export const FunctionalSpecSchema = z.object({
  appOverview: z.string(),
  elementSpecs: z.array(z.object({
    sketchNumber: z.number(),           // ← MISMO NÚMERO
    behavior: z.string(),
    businessRules: z.array(z.string()),
    dataNeeds: z.array(z.string()),
    acceptanceCriteria: z.array(z.string())  // → tests TDD
  })),
  globalRules: z.array(z.string())     // lógica no-visual
});
```

### 6.3 Reconciliation Schema

```javascript
export const ReconciliationSchema = z.object({
  valid: z.boolean(),
  boceto_numbers: z.array(z.number()),
  spec_numbers: z.array(z.number()),
  orphaned_sketch_elements: z.array(z.number()),
  orphaned_spec_rules: z.array(z.number()),
  notes: z.string()
});
```

---

## 7. Base de Datos: PostgreSQL + pgvector

### Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contenido
  content TEXT NOT NULL,                    -- JSON serializado
  embedding vector(1536),                   -- OpenAI embeddings
  
  -- Metadatos de trazabilidad
  phase VARCHAR(50) NOT NULL,               -- 'ui-spec', 'func-spec', 'use-case', 'test-red', 'code'
  feature_id VARCHAR(100) NOT NULL,         -- ej: 'app-1', 'app-1-feature-xyz'
  agent VARCHAR(50),                        -- 'designer-front', 'business-analyst', etc.
  sketch_number INT,                        -- Vinculación a elemento visual (CLAVE)
  version INT DEFAULT 1,
  
  -- Auditoría
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100)
);

-- Índices
CREATE INDEX idx_knowledge_base_phase ON knowledge_base(phase);
CREATE INDEX idx_knowledge_base_feature_id ON knowledge_base(feature_id);
CREATE INDEX idx_knowledge_base_sketch_number ON knowledge_base(sketch_number);
CREATE INDEX idx_knowledge_base_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops);
```

### Búsqueda híbrida (vector + filtros)

```javascript
// lib/tools/rag-client.js
export async function search(query, { phase, featureId, sketchNumber, limit = 5 }) {
  const embedding = await getEmbedding(query);
  
  return await db.query(`
    SELECT id, content, phase, feature_id, sketch_number, 
           1 - (embedding <=> $1) AS similarity
    FROM knowledge_base
    WHERE 
      ($2::varchar IS NULL OR phase = $2)
      AND ($3::varchar IS NULL OR feature_id = $3)
      AND ($4::int IS NULL OR sketch_number = $4)
    ORDER BY embedding <=> $1
    LIMIT $5
  `, [embedding, phase, featureId, sketchNumber, limit]);
}
```

---

## 8. Stack y Dependencias

| Capa | Tecnología | Versión | Rol |
|------|-----------|---------|-----|
| Agentes | Anthropic Claude 3.5 Sonnet | latest | LLM generativo |
| Embeddings | OpenAI text-embedding-3-small | latest | Vectorización |
| BD RAG | PostgreSQL + pgvector | 16 + 0.7 | Almacenamiento |
| Backend | Node.js + Express | 20 LTS | Runtime |
| Validación | Zod | 3.x | Schemas |
| Frontend | Web Components + Tailwind | native + 3.x | UI |
| Tests Backend | Vitest + node-fetch | 2.x | TDD |
| Tests Frontend | @web/test-runner | latest | TDD |
| Docs | VitePress | 1.x | Static site |
| Deploy Docs | GitHub Pages | - | Hosting |
| CI/CD | GitHub Actions | - | Automatización |

---

## 9. Flujo Completo: Ejemplo Paso a Paso

**Entrada: App de Lista de Tareas**

1. Input: boceto.png con elementos numerados (#1 Nav, #2 Lista tareas, #7 Formulario crear tarea, #9 Modal confirmar eliminación)
2. Conversación: "Necesito una app de tareas. El elemento #7 debe validar que el texto no esté vacío. El #9 debe pedir confirmación antes de borrar."

**Paso a paso:**

1. Agente 1 → UISpec: `{ screens: [{ components: [{ sketchNumber: 1, type: "nav", ...}, { sketchNumber: 7, type: "form", ...}] }] }`
2. Agente 2 → FuncSpec: `{ elementSpecs: [{ sketchNumber: 7, behavior: "valida texto vacío", acceptanceCriteria: ["Dado texto vacío, cuando submit, entonces error"] }] }`
3. Gate: reconciliation.json → `valid: true` (todos los sketch_numbers coinciden)
4. Agente 3 → Use Cases: UC7: "Crear tarea": 1. Usuario llena texto, 2. Hace click Submit (#7), 3. Sistema valida...
5. Agente 4 → Test ROJO: `describe('Form #7', () => { it('should reject empty text', ...) }) // FALLA`
6. Agente 5 → Código: `class TaskForm extends HTMLElement { validate() { if (!this.text) throw... } } // Tests VERDES`
7. HTML: `<form data-element-id="7" is="task-form">`

---

## 10. Ventajas de Esta Arquitectura

### Para el Flujo de Desarrollo
- **Trazabilidad total**: Código ↔ Test ↔ Use Case ↔ Req. Funcional ↔ Boceto. Sin ambigüedad.
- **Sin ambigüedad**: sketchNumber es clave foránea universal.
- **TDD real**: Los tests se generan antes que el código.
- **Contexto preciso**: RAG busca exactamente la información relevante para cada agente.

### Para el Sistema en Sí
- **Memoria persistente**: Los artefactos sobreviven entre sesiones.
- **Versionado**: Cada generación tiene versión incremental.
- **Auditabilidad**: Sabe qué agente generó qué, cuándo, para qué feature.

### Para el Equipo/Proceso
- **Gate humano**: Reconciliación fuerza validación antes de generar código.
- **Documentación automática**: VitePress usa los mismos artefactos como fuente.
- **GitHub Pages**: Documentación siempre disponible y actualizada.

---

## 11. Limitaciones y Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Alucinaciones en specs | Validación Zod + revisión humana en Gate |
| Embeddings inconsistentes | Mismo modelo en todo el pipeline |
| Versioning de artefactos | Campo version + updated_at en BD |
| Costos API | Cacheo en pgvector, prompts optimizados |
| Dependencia OpenAI (embeddings) | Abstracción en rag-client.js, sustituible |

---

## 12. Decisiones Clave

| Decisión | Opción Elegida | Justificación |
|----------|----------------|---------------|
| **Lenguaje para CLI** | Node.js | Stack coherente, sin Python overhead |
| **RAG** | PostgreSQL + pgvector | Un único stack de datos, búsqueda híbrida |
| **Validación** | Zod (TypeScript-first) | Seguridad de tipos, sin decoradores |
| **Documentación** | VitePress | Node puro, tema limpio, búsqueda local |
| **Orquestación** | State machine (XState o custom) | Simple, legible, sin frameworks pesados |
| **Tests frontend** | @web/test-runner | Web Components nativo, sin jsdom |
| **Frontend** | Web Components OO | Sin framework, máxima libertad de diseño |
| **Backend** | Express o Fastify | Simple, rápido, maduro |
| **Número del boceto** | Integer (sketchNumber) | Clave inmutable, foránea en todo el pipeline |

---

## 13. Flujo Completo: Un Ejemplo

1. [Humano] Crea boceto en Figma/papel, lo numera
   └─ #1: Nav, #7: Botón, #9: Modal

2. [Humano] Graba conversación con cliente
   └─ "Elemento #7 valida email en BBDD"
   └─ "Elemento #9 abre confirmación"

3. [CLI] node cli run-agent designer-front --sketch boceto.png
   ├─ Claude procesa imagen
   ├─ Genera UI Spec JSON { sketchNumber, type, ... }
   ├─ Valida contra UISpecSchema
   └─ Persiste en RAG (phase='ui-spec')

4. [CLI] node cli run-agent business-analyst --conversation conv.md
   ├─ Claude lee conversación + UI Spec (del RAG)
   ├─ Genera Functional Spec JSON
   ├─ Mapea referencias #números a elementSpecs
   └─ Persiste en RAG (phase='func-spec')

5. [CLI] node cli reconcile --feature-id "app-1"
   ├─ Compara boceto numbers == spec numbers
   ├─ Genera reconciliation.json
   └─ [GATE] Espera aprobación humana

6. [Humano] Revisa reconciliation.json, aprueba ✅

7. [CLI] node cli run-agent requirement-architect --feature-id "app-1"
   ├─ Claude genera casos de uso
   ├─ Genera esquema Postgres (DDL)
   ├─ Genera contratos API
   └─ Persiste en RAG (phase='use-case')

8. [CLI] node cli run-agent tdd-engineer --feature-id "app-1"
   ├─ Claude deriva tests de acceptanceCriteria
   ├─ Genera test files (rojo)
   ├─ Vincula cada test a sketchNumber vía describe()
   └─ Persiste en RAG (phase='test-red')

9. [CLI] npm run test
   └─ Todos los tests FALLAN (rojo) ✗

10. [CLI] node cli run-agent implementer --feature-id "app-1"
    ├─ Claude lee tests + contratos
    ├─ Genera código (backend + frontend)
    ├─ Cuidado: solo lo suficiente para verde
    └─ Persiste en RAG (phase='code')

11. [CLI] npm run test
    └─ Todos los tests PASAN (verde) ✅

12. [Humano] Revisa código, propone refactor

13. [CLI] npm run docs:build && npm run docs:preview
    └─ Documentación generada desde artefactos

14. [Git] git push origin main
    └─ GitHub Actions:
       ├─ Valida schemas
       ├─ Verifica trazabilidad
       ├─ Genera docs
       └─ Deploy a Pages

---

## 14. Hitos del Proyecto

### Fase 1: Setup y MVP (Semana 1-2)
- [ ] Repo con estructura base
- [ ] README + TECHNICAL_SUMMARY
- [ ] Schemas Zod definidos
- [ ] PostgreSQL + pgvector setup
- [ ] Claude client básico
- [ ] CLI esqueleto con un comando (create-project)

### Fase 2: Agentes (Semana 3-4)
- [ ] Designer Front agent (+ validación humana)
- [ ] Business Analyst agent
- [ ] Reconciliation validation
- [ ] RAG client (persist + search)

### Fase 3: Requisitos y TDD (Semana 5-6)
- [ ] Requirement Architect agent
- [ ] TDD Engineer agent
- [ ] Test Generator
- [ ] Handoff validator mejorado

### Fase 4: Implementación (Semana 7-8)
- [ ] Implementer agent
- [ ] Código backend + frontend
- [ ] Validador/Revisor agent

### Fase 5: Documentación (Semana 9)
- [ ] VitePress setup
- [ ] Documentación guías
- [ ] Ejemplo completo documentado
- [ ] GitHub Pages deploy

### Fase 6: Comunidad (Semana 10+)
- [ ] Issues templates
- [ ] Contributing guidelines
- [ ] Más ejemplos
- [ ] Feedback y mejoras

---

*Este documento es el artefacto de referencia técnica. Actualizar cuando cambie la arquitectura.*

---

## 15. Checklist para Iniciar

### Antes de escribir código

- [ ] Crear repo en GitHub
- [ ] Clonar y setup local
- [ ] Crear TECHNICAL_SUMMARY.md (este archivo)
- [ ] Crear README.md con visión
- [ ] Crear docs/index.md (landing VitePress)

### Primeras herramientas

```bash
# package.json base
npm init -y
npm install zod pg pg-vector node-fetch
npm install -D vitepress vitest @web/test-runner

# PostgreSQL (local)
docker run -d --name pg -e POSTGRES_PASSWORD=pwd -p 5432:5432 pgvector/pgvector:pg16

# Variables entorno
echo "ANTHROPIC_API_KEY=sk-..." > .env
echo "DATABASE_URL=postgresql://postgres:pwd@localhost:5432/rag_db" >> .env
```

### Primer agente

1. Crear lib/agents/designer-front.js con prompt mínimo
2. Crear lib/schemas/ui-spec.schema.js con Zod
3. Crear cli/commands/run-agent.js básico
4. Hacer test manual con un boceto simple

---

## 16. Recursos y Referencias

Documentación interna (por escribir):
- docs/guide/01-arquitectura.md
- docs/guide/02-workflow.md
- docs/guide/03-agent-roles.md
- docs/guide/04-rag-schema.md
- docs/guide/05-frontend-design.md
- docs/guide/06-api-contracts.md
- docs/guide/07-tdd-traceability.md

Herramientas externas:
- [pgvector docs](https://github.com/pgvector/pgvector)
- [Zod docs](https://zod.dev)
- [Claude API docs](https://docs.anthropic.com)
- [VitePress docs](https://vitepress.dev)
- [Web Components](https://developer.mozilla.org/en-US/docs/Web/Web_Components)

---

## Conclusión

Este proyecto es un sistema coherente de ingeniería de software donde:

1. La entrada es visual + textual, no ambigua.
2. La trazabilidad es por diseño, no agregada después.
3. El código no es el final, es una consecuencia de las specs correctas.
4. La documentación es generada, no escrita manualmente.
5. Todo es versionable y reproducible en Git.

El sketchNumber es el hilo que lo une todo. Desde ahí, el sistema es mecánico: valida, genera, persiste, avanza.

Punto de partida: Boceto numerado + Conversación.  
Punto final: Aplicación completa + Documentación en Pages.  
En el medio: Agentes, RAG, tests, código.

---

Última actualización: Mayo 2024  
Para: Inicio del proyecto  
Audiencia: Claude (y David, para referencia)
