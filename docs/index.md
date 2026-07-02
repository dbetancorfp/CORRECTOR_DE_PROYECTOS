# Corrector de Proyectos

**Corrector de Proyectos** es una aplicación web para profesorado de FP
(Formación Profesional, España) que permite gestionar y calificar proyectos de
fin de ciclo mediante rúbricas estructuradas.

La aplicación se construye con un pipeline **RAG Spec-Driven Development**: los
prototipos HTML anotados con `data-element-id` y una transcripción de requisitos
se convierten, a través de 10 agentes Claude especializados, en código backend +
frontend completamente trazable y testado.

---

<div class="grid cards" markdown>

-   :material-clipboard-check:{ .lg .middle } **Guía de usuario**

    ---

    Roles, flujo de pantallas y modelo de dominio.

    [:octicons-arrow-right-24: Ver guía](guia.md)

-   :material-cog:{ .lg .middle } **Arquitectura técnica**

    ---

    Pipeline RAG, los 10 agentes, base de datos pgvector y stack completo.

    [:octicons-arrow-right-24: Ver arquitectura](arquitectura.md)

-   :material-timeline:{ .lg .middle } **Flujo del pipeline**

    ---

    Artefactos, fases y flujo de creación paso a paso.

    [:octicons-arrow-right-24: Ver flujo](flujo.md)

-   :material-file-document:{ .lg .middle } **Especificación funcional**

    ---

    122 elementos con comportamiento, reglas de negocio y criterios de aceptación.

    [:octicons-arrow-right-24: Ver especificación](funcional.md)

-   :material-sitemap:{ .lg .middle } **Casos de uso**

    ---

    10 flujos funcionales (UC-01 a UC-10) derivados del functional-spec.

    [:octicons-arrow-right-24: Ver casos de uso](casos-de-uso.md)

-   :material-language-javascript:{ .lg .middle } **JS Avanzado — Specs**

    ---

    JavaScript Avanzado: fundamentos, asincronía, DOM y Web Components.

    [:octicons-arrow-right-24: Ver specs](especificaciones.md)

</div>

---

## Gestión de tareas

Toda tarea, mejora, bug o propuesta de cambio se registra como un
**[Issue de GitHub](https://github.com/dbetancorfp/CORRECTOR_DE_PROYECTOS/issues)**.
Los Issues son la única fuente de verdad del trabajo pendiente y en curso.

| Tipo de tarea | Etiqueta recomendada |
|---------------|---------------------|
| Nueva funcionalidad | `enhancement` |
| Bug o error detectado | `bug` |
| Mejora de documentación | `documentation` |
| Tarea de pipeline / agente | `pipeline` |
| Revisión SOLID (Agente 9) | `quality` |
| Quality Gate SonarCloud ❌ | `quality` |

**SonarCloud** analiza automáticamente cada push y PR. El Quality Gate debe
estar en ✅ antes de mergear. Dashboard:
[sonarcloud.io/project/overview?id=dbetancorfp_CORRECTOR_DE_PROYECTOS](https://sonarcloud.io/project/overview?id=dbetancorfp_CORRECTOR_DE_PROYECTOS)

## Estado del proyecto

| Fase | Agente | Estado |
|------|--------|--------|
| 0 | Boceto Parser | ✅ Implementado |
| 1 ∥ | Diseñador Front | ✅ Implementado |
| 2 ∥ | Analista de Negocio | ✅ Implementado |
| 3 | Validador de Alineación | ✅ Implementado |
| 4 | Generador Func. Spec | ✅ Implementado · ✅ Ejecutado |
| — | GATE HUMANO | ✅ Implementado · ✅ Ejecutado |
| 5 | Arquitecto de Requisitos | ✅ Implementado · ✅ Ejecutado |
| 6 | Ingeniero TDD | ✅ Implementado · ✅ Ejecutado |
| 7 | Implementador | ✅ Implementado · ✅ Ejecutado |
| 8 | Ingeniero E2E | ✅ Implementado · ✅ Ejecutado |
| 9 | Revisor / QA | ✅ Implementado |

Las tres entradas del pipeline están listas:

| Entrada | Artefacto | Estado |
|---------|-----------|--------|
| Boceto | 122 elementos · 12 pantallas | ✅ Listo |
| Entrevista cliente | `corrector/02-conversacion-cliente/transcripcion.md` | ✅ Lista |
| Esquema BD | `corrector/05-implementation/backend/schema.sql` · 14 tablas · 2 triggers | ✅ Listo |

El pipeline ha sido ejecutado hasta el **Agente 8** inclusive. El siguiente paso es el **Agente 9 — Revisor / QA** (`/reviewer`).
