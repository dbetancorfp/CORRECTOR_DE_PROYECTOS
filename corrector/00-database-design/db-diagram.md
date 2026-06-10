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
        serial      id             PK
        varchar     name           "NOT NULL"
        varchar     abbreviation   "NOT NULL"
        smallint    weekly_hours   "NOT NULL"
        int         cycle_id       FK
    }

    teacher {
        serial       id              PK
        varchar      username        "UNIQUE NOT NULL"
        text         password_hash   "NOT NULL"
        teacher_role role            "admin|teacher|tutor"
        int          tutor_cycle_id  "FK nullable UNIQUE"
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
        int         cycle_id       FK
        char9       academic_year  "NOT NULL e.g. 2024-2025"
    }

    project_student {
        int         project_id  FK
        int         student_id  FK
    }

    rubric {
        serial      id             PK
        int         module_id      FK
        int         teacher_id     FK
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
        varchar     name            "NOT NULL e.g. Excellent"
        smallint    display_order   "NOT NULL"
        numeric52   score           "NOT NULL >= 0"
    }

    correction {
        serial      id             PK
        int         student_id     FK
        int         module_id      FK
        int         rubric_id      FK
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
    cycle           ||--o{    project          : "groups"
    cycle           o|--o|    teacher          : "tutored by (0-1)"
    teacher         ||--o{    teacher_module   : "teaches"
    teacher_module  }o--||    module           : "taught by"
    student         }o--||    cycle            : "enrolled in"
    student         ||--o{    student_module   : "assigned to"
    student_module  }o--||    module           : "assigned to"
    student         ||--o{    project_student  : "member of"
    project_student }o--||    project          : "includes"
    rubric          }o--||    module           : "scores"
    rubric          }o--||    teacher          : "designed by"
    rubric          ||--o{    rubric_item      : "contains"
    rubric_item     ||--o{    rubric_level     : "has levels"
    correction      }o--||    student          : "of"
    correction      }o--||    module           : "in"
    correction      }o--||    rubric           : "using"
    correction      ||--o{    correction_item  : "broken down by item"
    correction_item }o--||    rubric_level     : "level chosen"
```

## Model notes

- **`teacher.tutor_cycle_id`** — UNIQUE + nullable. Combined with `CHECK (role = 'tutor') = (tutor_cycle_id IS NOT NULL)`, this guarantees each cycle has at most 1 tutor and every tutor has exactly 1 assigned cycle. A trigger adds a descriptive error message on violation.

- **`rubric_level` is scoped per item (irregular matrix).** Each item defines its own set of levels with independent names, ordering and score values. There is no shared level pool per rubric. This means item A can have 3 levels and item B can have 5 within the same rubric.

- **`correction_item` composite FK** — `FOREIGN KEY (rubric_item_id, rubric_level_id) REFERENCES rubric_level(rubric_item_id, id)` enforces at the database level that the chosen level belongs to the stated item. No trigger needed.

- **`correction.final_score`** — computed by the application as `SUM(score of selected levels) / SUM(max score per item) × 10`. Not stored on `rubric` because it is always derived from `rubric_level.score`.

- **`correction.academic_year`** — denormalised from `rubric.academic_year` to support `UNIQUE(student_id, module_id, academic_year)` without a JOIN and to facilitate queries like "all grades for student X in year Y".

- **`project_student`** — one project per student per academic year enforced by trigger (`academic_year` lives on `project`, not on `project_student`, so a plain `UNIQUE` constraint cannot express this).

- **`teacher_module` / `student_module`** — permanent assignments with no academic year. The temporal context is derivable via `module → cycle → legislation → start_year`.

- **`legislation.name`** — replaces `abbreviation`; the full name (e.g. LOMLOE) is the unique identifier. `end_year` removed — derivable as `start_year + 1`.
