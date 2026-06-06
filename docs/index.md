# Corrector de Proyectos

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

    90 elementos con comportamiento, reglas de negocio y criterios de aceptación.

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

## ¿Qué es?

**Corrector de Proyectos** es una aplicación web para profesorado de FP
(Formación Profesional, España) que permite gestionar y calificar proyectos de
fin de ciclo mediante rúbricas estructuradas.

La aplicación se construye con un pipeline **RAG Spec-Driven Development**: los
prototipos HTML anotados con `data-element-id` y una transcripción de requisitos
se convierten, a través de 10 agentes Claude especializados, en código backend +
frontend completamente trazable y testado.

## Estado del proyecto

| Fase | Agente | Estado |
|------|--------|--------|
| 0 | Boceto Parser | ✅ Implementado |
| 1 ∥ | Diseñador Front | ✅ Implementado |
| 2 ∥ | Analista de Negocio | ✅ Implementado |
| 3 | Validador de Alineación | ✅ Implementado |
| 4 | Generador Func. Spec | ✅ Implementado |
| — | GATE HUMANO | ✅ Implementado |
| 5 | Arquitecto de Requisitos | ✅ Implementado |
| 6 | Ingeniero TDD | ✅ Implementado |
| 7 | Implementador | ✅ Implementado |
| 8 | Ingeniero E2E | ✅ Implementado |
| 9 | Revisor / QA | 🔲 Pendiente |

Los **bocetos** (90 elementos, 11 pantallas) y la **transcripción de cliente** están listos.
El pipeline completo de agentes está implementado y a la espera de ejecutarse sobre el proyecto.

## Prototipos HTML

Los 11 prototipos HTML anotados con `data-element-id` están en
[`corrector/01-boceto/html-source-prototype/`](https://github.com/dbetancorfp/CORRECTOR_DE_PROYECTOS/tree/main/corrector/01-boceto/html-source-prototype)
y el registro descriptivo completo en
[`boceto-elements.md`](https://github.com/dbetancorfp/CORRECTOR_DE_PROYECTOS/blob/main/corrector/01-boceto/boceto-elements.md)
(90 elementos, #1–#90).
