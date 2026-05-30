# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

**Corrector de Proyectos** is a web application for teachers in Spanish vocational education (FP - Formación Profesional) to manage and grade end-of-cycle student projects using a rubric-based scoring system.

The project is currently at the **HTML prototype stage** — all files in `html-source-prototype/` are static HTML screens with no CSS, no JavaScript logic, and no backend. They serve as a UI reference for the implementation to come. No build system, framework, or test runner is set up yet.

To view prototypes: open any `.html` file directly in a browser.

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
