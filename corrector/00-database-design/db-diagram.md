# Diagrama ERD — Corrector de Proyectos

```mermaid
erDiagram
    legislation {
        serial      id          PK
        varchar     name        "UNIQUE NOT NULL"
        smallint    start_year  "NOT NULL"
    }

    cycle {
        serial      id              PK
        varchar     name            "NOT NULL"
        int         legislation_id  FK
    }

    module {
        serial      id            PK
        varchar     name          "NOT NULL"
        smallint    weekly_hours  "NOT NULL"
        int         cycle_id      FK
    }

    teacher {
        serial      id              PK
        varchar     username        "UNIQUE NOT NULL"
        text        password_hash   "NOT NULL"
        varchar     role            "admin|teacher|tutor CHECK"
        int         tutor_cycle_id  "FK nullable UNIQUE"
    }

    teacher_module {
        int         teacher_id  FK
        int         module_id   FK
    }

    student {
        serial      id        PK
        varchar     name      "NOT NULL — free text"
        int         cycle_id  FK
    }

    student_module {
        int         student_id  FK
        int         module_id   FK
    }

    project {
        serial      id             PK
        varchar     name           "NOT NULL"
        char9       academic_year  "NOT NULL e.g. 2024-2025"
    }

    project_student {
        int         project_id  FK
        int         student_id  FK
    }

    rubric {
        serial      id             PK
        int         module_id      FK
        char9       academic_year  "NOT NULL"
        varchar     name           "NULL optional"
    }

    rubric_item {
        serial      id             PK
        int         rubric_id      FK
        text        description    "NOT NULL"
        smallint    display_order  "NOT NULL"
    }

    rubric_level {
        serial      id              PK
        int         rubric_item_id  FK
        varchar     name            "NOT NULL"
        smallint    display_order   "NOT NULL"
        numeric52   score           "NOT NULL >= 0"
    }

    correction {
        serial      id             PK
        int         student_id     FK
        int         module_id      FK
        int         rubric_id      FK
        int         teacher_id     FK
        char9       academic_year  "NOT NULL"
        numeric42   final_score    "CHECK 0..10"
    }

    correction_item {
        int         correction_id   FK
        int         rubric_item_id  FK
        int         rubric_level_id FK
    }

    legislation     ||--o{    cycle            : "frames"
    cycle           ||--o{    module           : "contains"
    cycle           o|--o|    teacher          : "tutored by (0-1)"
    teacher         ||--o{    teacher_module   : "teaches"
    teacher_module  }o--||    module           : "taught by"
    student         }o--||    cycle            : "enrolled in"
    student         ||--o{    student_module   : "assigned to"
    student_module  }o--||    module           : "assigned to"
    student         ||--o{    project_student  : "member of"
    project_student }o--||    project          : "includes"
    rubric          }o--||    module           : "scores"
    rubric          ||--o{    rubric_item      : "contains"
    rubric_item     ||--o{    rubric_level     : "has levels"
    correction      }o--||    student          : "of"
    correction      }o--||    module           : "in"
    correction      }o--||    rubric           : "using"
    correction      }o--||    teacher          : "by"
    correction      ||--o{    correction_item  : "broken down by item"
    correction_item }o--||    rubric_level     : "level chosen"
```

## Notas del modelo

- **`cycle` UNIQUE(name, legislation_id)** — El mismo nombre de ciclo puede existir bajo legislaciones distintas (e.g. "DAW" en LOE y en LOMLOE son registros independientes).

- **`module` UNIQUE(name, cycle_id)** — No puede haber dos módulos con el mismo nombre dentro del mismo ciclo.

- **`teacher.role`** — `VARCHAR(10) CHECK (role IN ('admin', 'teacher', 'tutor'))`. Sin ENUM: más portable y compatible con generación de código SQL.

- **`teacher.tutor_cycle_id`** — UNIQUE + nullable. `CHECK (role = 'tutor') = (tutor_cycle_id IS NOT NULL)` garantiza que cada tutor tiene exactamente un ciclo asignado y cada ciclo tiene como máximo un tutor. Un trigger añade un mensaje de error claro en caso de violación.

- **`project` sin `cycle_id`** — El ciclo se infiere siempre a través de los alumnos miembros (`project_student → student → cycle`). No se almacena FK directa para evitar redundancia.

- **`rubric` sin `teacher_id`** — La rúbrica es un recurso del módulo, no de un profesor concreto. Cualquier profesor asignado al módulo puede usarla o modificarla.

- **`correction.teacher_id`** — Registra el profesor que realizó la corrección. Se preserva aunque el profesor cambie de asignación de módulo posteriormente (trazabilidad de autoría).

- **`rubric_level` con matriz irregular** — Los niveles se definen por ítem, no por rúbrica. Cada ítem define sus propios niveles con nombres, orden y puntuación independientes. El ítem A puede tener 3 niveles y el ítem B puede tener 5 dentro de la misma rúbrica.

- **FK compuesta en `correction_item`** — `FOREIGN KEY (rubric_item_id, rubric_level_id) REFERENCES rubric_level(rubric_item_id, id)` garantiza a nivel de BD que el nivel elegido pertenece al ítem correcto. No se necesita trigger adicional.

- **`correction.final_score`** — Calculado por la aplicación como `SUM(score de niveles elegidos) / SUM(score máximo por ítem) × 10`. No se almacena en `rubric` porque siempre es derivable.

- **`correction.academic_year` denormalizado** — Copiado de `rubric.academic_year` para permitir `UNIQUE(student_id, module_id, academic_year)` sin JOIN y facilitar consultas directas por año.

- **`project_student` con trigger** — La restricción "un alumno, un proyecto por año académico" no es expresable con una FK simple porque `academic_year` vive en `project`, no en `project_student`.

- **`teacher_module` / `student_module` sin año académico** — Asignaciones permanentes. El contexto temporal es derivable vía `module → cycle → legislation → start_year`.
