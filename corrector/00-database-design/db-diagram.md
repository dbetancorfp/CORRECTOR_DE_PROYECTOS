# Diagrama ERD — Corrector de Proyectos

```mermaid
erDiagram
    legislacion {
        serial      id              PK
        varchar     abreviatura     "UNIQUE NOT NULL"
        smallint    anio_inicio     "NOT NULL"
        smallint    anio_fin        "NULL si sigue vigente"
    }

    ciclo {
        serial      id              PK
        varchar     nombre          "NOT NULL"
        int         legislacion_id  FK
    }

    modulo {
        serial      id              PK
        varchar     nombre          "NOT NULL"
        varchar     abreviatura     "NOT NULL"
        smallint    horas_semanales "NOT NULL"
        int         ciclo_id        FK
    }

    profesor {
        serial      id              PK
        varchar     username        "UNIQUE NOT NULL"
        text        password_hash   "NOT NULL"
        profesor_rol rol            "admin|profesor|tutor"
        int         tutor_ciclo_id  "FK nullable UNIQUE"
    }

    profesor_modulo {
        int         profesor_id     FK
        int         modulo_id       FK
    }

    alumno {
        serial      id              PK
        varchar     nombre          "NOT NULL — texto libre"
        int         ciclo_id        FK
    }

    alumno_modulo {
        int         alumno_id       FK
        int         modulo_id       FK
    }

    proyecto {
        serial      id              PK
        varchar     nombre          "NOT NULL"
        int         ciclo_id        FK
        char9       academic_year   "NOT NULL p.ej. 2024-2025"
    }

    proyecto_alumno {
        int         proyecto_id     FK
        int         alumno_id       FK
    }

    rubrica {
        serial      id              PK
        int         modulo_id       FK
        int         profesor_id     FK
        char9       academic_year   "NOT NULL"
        varchar     nombre          "NULL opcional"
    }

    rubrica_item {
        serial      id              PK
        int         rubrica_id      FK
        text        descripcion     "NOT NULL"
        smallint    orden           "NOT NULL"
    }

    rubrica_nivel {
        serial      id              PK
        int         rubrica_id      FK
        varchar     nombre          "NOT NULL p.ej. Excelente"
        smallint    orden           "NOT NULL"
    }

    rubrica_item_nivel {
        int         rubrica_item_id FK
        int         rubrica_nivel_id FK
        numeric52   valor           "NOT NULL >= 0"
    }

    correccion {
        serial      id              PK
        int         alumno_id       FK
        int         modulo_id       FK
        int         rubrica_id      FK
        char9       academic_year   "NOT NULL"
        numeric42   nota_final      "CHECK 0..10"
    }

    correccion_item {
        int         correccion_id   FK
        int         rubrica_item_id FK
        int         rubrica_nivel_id FK
    }

    legislacion    ||--o{    ciclo              : "tiene"
    ciclo          ||--o{    modulo             : "contiene"
    ciclo          ||--o{    proyecto           : "agrupa"
    ciclo          o|--o{    profesor           : "tutor de (0-2)"
    profesor       }o--o{    modulo             : "imparte"
    alumno         }o--||    ciclo              : "pertenece a"
    alumno         }o--o{    modulo             : "matriculado en"
    alumno         }o--o{    proyecto           : "participa en"
    rubrica        }o--||    modulo             : "evalúa"
    rubrica        }o--||    profesor           : "diseñada por"
    rubrica        ||--o{    rubrica_item       : "contiene"
    rubrica        ||--o{    rubrica_nivel      : "define"
    rubrica_item   }o--o{    rubrica_nivel      : "valorado en"
    correccion     }o--||    alumno             : "de"
    correccion     }o--||    modulo             : "en"
    correccion     }o--||    rubrica            : "usando"
    correccion     ||--o{    correccion_item    : "detalle por ítem"
    correccion_item }o--||   rubrica_item_nivel : "nivel elegido"
```

## Notas del modelo

- **`profesor.tutor_ciclo_id`** — UNIQUE + nullable. La relación ciclo↔tutor es bidireccional
  pero se implementa como FK en `profesor`, no como tabla puente, porque la unicidad por lado
  profesor es un constraint simple. El límite de 2 tutores por ciclo se refuerza con trigger.

- **`profesor_modulo`** — asignación actual sin año académico. La historia de quién impartió
  qué módulo en cada año es derivable de `rubrica(modulo_id, profesor_id, academic_year)`.

- **`rubrica_item_nivel`** — celda de la matriz ítem×nivel. Un trigger garantiza que el ítem
  y el nivel pertenecen a la misma rúbrica (integridad cruzada no expresable con FK simples).

- **`correccion.academic_year`** — denormalizado desde `rubrica.academic_year` para permitir
  el constraint UNIQUE(alumno_id, modulo_id, academic_year) sin JOIN y para facilitar consultas
  del tipo "notas del alumno X en el curso Y".

- **`correccion.nota_final`** — calculada por la aplicación como
  `SUM(valor celdas seleccionadas) / SUM(valor máximo por ítem) × 10`. No se almacena
  `puntuacion_maxima` en `rubrica` porque es siempre derivada.

- **`proyecto_alumno`** — un alumno puede estar en un solo proyecto por año académico.
  El constraint UNIQUE(alumno_id, academic_year) no puede expresarse directamente con una FK
  (el año está en `proyecto`, no en `proyecto_alumno`), por lo que se refuerza con trigger.

- **`legislacion.anio_fin`** — nullable; NULL indica que la legislación sigue en vigor.

- **`alumno.nombre`** — texto libre. El profesor decide si introduce un nombre real o un
  código anonimizado (p. ej. `JJ499`). El sistema no impone formato.
