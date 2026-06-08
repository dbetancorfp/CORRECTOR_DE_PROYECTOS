# Estado de sesión — Diseñador de BD

> **Cómo reanudar:** ejecuta `/db-schema-designer` y dile al agente
> "Retoma la sesión desde `corrector/00-database-design/session-state.md`".
> El agente debe leer este fichero, presentar un resumen del estado y
> continuar con las preguntas pendientes desde donde se dejó.

---

## Fase actual: 3 — Entrevista estructurada (en curso)

**Estado:** ✅ COMPLETADO — Fase 6 (Cierre)

**Artefactos generados:**
- `corrector/00-database-design/db-diagram.md`
- `corrector/05-implementation/backend/schema.sql`

---

## Entidades identificadas

| Entidad | Atributos conocidos | Faltan |
|---------|---------------------|--------|
| `profesor` | username, password_hash, rol (`admin\|profesor\|tutor`), tutor_ciclo_id nullable | — |
| `ciclo` | nombre, legislación | año académico, descripción |
| `legislacion` | abreviatura (ej. LOMLOE), año inicio, año fin | — |
| `modulo` | nombre, abreviatura (ej. DEW), horas semanales, ciclo | — |
| `alumno` | nombre (texto libre — nombre real o código, a criterio del profesor), ciclo | — |
| `proyecto` | nombre, ciclo, lista de alumnos | año académico, estado |
| `rubrica` | módulo, ciclo, profesor diseñador, puntuación máxima | nombre/título |
| `rubrica_item` | pertenece a rúbrica, descripción | — |
| `rubrica_nivel` | pertenece a rúbrica, nombre (Excelente…), orden | — |
| `rubrica_item_nivel` | ítem + nivel + valor numérico (celda de la matriz) | tabla de intersección ítem × nivel |
| `correccion` | alumno, módulo, nota final normalizada a 10 | — |
| `correccion_item` | correccion + rubrica_item + rubrica_nivel seleccionado + valor | desglose por ítem para recálculo |

---

## Relaciones identificadas

| Tabla A | Tabla B | Cardinalidad | Nota |
|---------|---------|--------------|------|
| `profesor` | `ciclo` (como tutor) | N : 1 | `profesor.tutor_ciclo_id` nullable + UNIQUE; trigger MAX 2 tutores/ciclo |
| `profesor` | `modulo` | N : M | un profesor imparte módulos de ciclos distintos |
| `alumno` | `ciclo` | N : 1 | un alumno pertenece a un ciclo |
| `alumno` | `modulo` | N : M vía `alumno_modulo` | matrícula explícita, gestionada por el profesor |
| `alumno` | `proyecto` | N : M vía `proyecto_alumno` | UNIQUE(alumno_id, año_académico) — un alumno solo en un proyecto por año |
| `rubrica` | `modulo` | ? : 1 | una rúbrica corrige un módulo; ¿puede haber varias por módulo? |
| `rubrica` | `profesor` | N : 1 | la diseña un profesor |
| `rubrica` | `rubrica_item` | 1 : N | — |
| `rubrica` | `rubrica_nivel` | 1 : N | niveles variables por rúbrica |
| `rubrica_item` | `rubrica_nivel` | N : M | vía `rubrica_item_nivel` (cada celda de la matriz tiene su valor) |
| `correccion` | `correccion_item` | 1 : N | desglose por ítem del nivel seleccionado |
| `correccion_item` | `rubrica_item_nivel` | N : 1 | apunta a la celda concreta elegida |

---

## Inconsistencias detectadas

- *"Un usuario profesor es tutor de un Ciclo y **es único**."* ✅ RESUELTA — "único" se refiere
  al lado del **profesor**: cada profesor puede ser tutor de como máximo 1 ciclo (unicidad en
  `profesor.tutor_ciclo_id`). Un ciclo puede tener 0–2 tutores. Constraint de negocio:
  `COUNT(tutores por ciclo) ≤ 2` → se implementa con trigger en PostgreSQL.
- `rubrica.puntuacion_maxima` (CLAUDE.md) posiblemente redundante: el máximo teórico es la
  suma automática de los valores más altos por ítem. Pendiente de confirmar si el campo
  existe o se deriva. ← sin bloquear diseño.

---

## Lagunas pendientes — 8 preguntas organizadas por turno

### Turno 1 — Rúbrica (estructura de puntuación) ✅ RESPONDIDO

1. ~~¿Cada ítem tiene su propio valor numérico por nivel...?~~ → **Matriz ítem × nivel; cada celda tiene valor independiente.**
2. ~~El flujo de corrección...~~ → **El profesor selecciona nivel por ítem; el sistema suma y pondera a 10.**
3. ~~¿Se guarda el desglose por ítem...?~~ → **Sí, se guarda el desglose para poder recalcular.**

### Turno 2 — Profesor ↔ Ciclo (constraint crítico) ✅ RESPONDIDO

4. ~~"No puede haber más de 2..."~~ → **Un ciclo puede tener 0, 1 o 2 tutores; nunca más.**
5. ~~¿Puede existir un ciclo sin tutor?~~ → **Sí. El ciclo se crea primero; el tutor se asigna al crear/editar el profesor.**
6. ~~¿Relación directa ciclo-profesor?~~ → **No. El vínculo es ciclo → módulo → profesor.**

### Turno 3 — Alumno ↔ Proyecto ↔ Módulo ✅ RESPONDIDO

7. ~~¿Puede un alumno pertenecer a más de un proyecto?~~ → **Un alumno solo pertenece a un proyecto por año académico.** UNIQUE(alumno_id, año_académico) en tabla proyecto_alumno. Confirma implícitamente que existe concepto de año académico (→ pregunta 9 resuelta).
8. ~~¿Matrícula explícita o derivada?~~ → **Explícita. El profesor matricula al alumno en el módulo.** Existe tabla alumno_modulo gestionada por el profesor.

### Turno 4 — Rúbrica y temporal ✅ RESPONDIDO

9. ~~¿Existe concepto de año académico?~~ ✅ RESUELTA IMPLÍCITAMENTE — la unicidad alumno-proyecto por año confirma que el año académico existe como campo en `proyecto` y `rubrica`.
10. ~~¿Rúbricas distintas por año?~~ → **Sí. Un módulo puede tener rúbricas distintas cada año** (distinto profesor o cambio deliberado). UNIQUE(modulo_id, academic_year) en `rubrica`.

---

## Artefactos a generar (pendientes)

- `corrector/00-database-design/db-diagram.md` — diagrama ERD Mermaid
- `corrector/05-implementation/backend/schema.sql` — DDL PostgreSQL 16

---

*Sesión pausada — 2026-06-08*
