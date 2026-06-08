# Esquema de la base de datos

DDL PostgreSQL 16 — fuente de verdad del modelo de datos.
Lo consumen directamente el **Agente 3 — Validador de Alineación** y todos los agentes
posteriores del pipeline.

---

## Entrevista de diseño de BD

Transcripción de la sesión `/db-schema-designer` con David Betancor. Documenta todas las
decisiones tomadas, las aclaraciones y las reglas de negocio que determinan el modelo.

### Descripción inicial del cliente

> El usuario con rol profesor puede ser también tutor.
> Un usuario profesor es tutor de un Ciclo y es único. No puede haber más de 2 asociados a un Ciclo.
> El usuario profesor puede impartir varios módulos de Ciclos diferentes.
> Registro nombre de alumnos.
> Un alumno está matriculado en un Ciclo.
> Un alumno puede no estar matriculado en todos los módulos de un Ciclo.
> Los alumnos están agrupados en proyectos.
> Registro una rúbrica que corrige un módulo de un ciclo concreto que diseña un profesor.
> La rúbrica contiene ítems y niveles.
> Los niveles de una rúbrica pueden ser variables según el diseño del profesor.
> Los profesores de un ciclo corregirán a cada alumno. Cada profesor corrige su módulo.
> Y se almacena alumno y nota por módulo.

### Aclaraciones y decisiones

**Rúbrica — estructura de puntuación**

- La rúbrica es una **matriz ítem × nivel**: cada celda tiene su propio valor numérico
  independiente. No todos los ítems comparten los mismos valores por nivel.
- Flujo de corrección: el profesor **selecciona un nivel por cada ítem**; el sistema suma
  los valores de los niveles seleccionados y **pondera el resultado a 10** (normalización
  automática). `puntuacion_maxima` no se almacena — es siempre derivada.
- Se guarda el **desglose por ítem** de cada corrección para poder recalcular la nota final.

**Profesor ↔ Ciclo**

- Un ciclo puede tener **0, 1 o 2 tutores**; nunca más.
- Un profesor puede ser tutor de **como máximo un ciclo** (unicidad del lado del profesor).
- El ciclo se crea primero; el tutor se asigna al crear o editar el profesor.
- **No existe relación directa ciclo → profesor.** El vínculo es `ciclo → módulo → profesor`.

**Alumno**

- Campo único: `nombre` (texto libre). El profesor decide si introduce nombre real o código
  anonimizado (p. ej. `JJ499`). El sistema no impone formato.

**Admin**

- Rol `'admin'` es un tercer valor del ENUM `rol` en la tabla `profesor`.
  Un admin no tiene `tutor_ciclo_id` ni entradas en `profesor_modulo`.

**Alumno ↔ Proyecto ↔ Módulo**

- Un alumno pertenece a **un único proyecto por año académico**.
- La matrícula en módulos es **explícita** (gestionada por el profesor), no derivada del proyecto.

**Rúbrica y temporalidad**

- Un módulo puede tener **rúbricas distintas en años académicos diferentes**.
  Constraint: `UNIQUE(modulo_id, academic_year)` en `rubrica`.

---

## Diagrama ERD

15 tablas · 3 triggers · PostgreSQL 16

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
        int         rubrica_item_id  FK
        int         rubrica_nivel_id FK
        numeric52   valor            "NOT NULL >= 0"
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
        int         correccion_id    FK
        int         rubrica_item_id  FK
        int         rubrica_nivel_id FK
    }

    legislacion     ||--o{   ciclo              : "tiene"
    ciclo           ||--o{   modulo             : "contiene"
    ciclo           ||--o{   proyecto           : "agrupa"
    ciclo           o|--o{   profesor           : "tutor de (0-2)"
    profesor        }o--o{   modulo             : "imparte"
    alumno          }o--||   ciclo              : "pertenece a"
    alumno          }o--o{   modulo             : "matriculado en"
    alumno          }o--o{   proyecto           : "participa en"
    rubrica         }o--||   modulo             : "evalúa"
    rubrica         }o--||   profesor           : "diseñada por"
    rubrica         ||--o{   rubrica_item       : "contiene"
    rubrica         ||--o{   rubrica_nivel      : "define"
    rubrica_item    }o--o{   rubrica_nivel      : "valorado en"
    correccion      }o--||   alumno             : "de"
    correccion      }o--||   modulo             : "en"
    correccion      }o--||   rubrica            : "usando"
    correccion      ||--o{   correccion_item    : "detalle por ítem"
    correccion_item }o--||   rubrica_item_nivel : "nivel elegido"
```

### Notas del modelo

| Decisión | Razonamiento |
|----------|-------------|
| `profesor.tutor_ciclo_id` UNIQUE nullable | Unicidad por lado profesor; límite de 2 tutores/ciclo con trigger |
| `profesor_modulo` sin año | Asignación actual; historial derivable de `rubrica(modulo_id, profesor_id, academic_year)` |
| `rubrica_item_nivel` con trigger | Integridad cruzada ítem×nivel no expresable con FK simples |
| `correccion.academic_year` denormalizado | Permite `UNIQUE(alumno_id, modulo_id, academic_year)` sin JOIN |
| `nota_final` derivada, no `puntuacion_maxima` | `SUM(celdas elegidas) / SUM(máximos por ítem) × 10` |
| `proyecto_alumno` con trigger | `UNIQUE(alumno_id, academic_year)` cruza dos tablas |
| `legislacion.anio_fin` nullable | NULL = legislación todavía en vigor |

---

## DDL — `schema.sql`

```sql
--8<-- "corrector/05-implementation/backend/schema.sql"
```
