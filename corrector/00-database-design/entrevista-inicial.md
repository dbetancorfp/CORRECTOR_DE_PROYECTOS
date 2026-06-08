# Entrevista inicial — Diseño de Base de Datos

> **Instrucciones:** Escribe aquí, en lenguaje natural, cómo tienes pensada la base de datos.
> No hace falta que sea técnico ni preciso. Describe las entidades, cómo se relacionan,
> qué datos necesitas guardar y cómo se usan. El agente `/db-schema-designer` leerá este
> fichero y te hará preguntas para cubrir todo lo que falte.
>
> Cuando hayas terminado de escribir, ejecuta: `/db-schema-designer`

---

El usuario con rol profesor pude ser también tutor.
Un usuario profesor es tutor de un Ciclo y es único. No puede haber más de 2 asociados a un Ciclo.
El usuario profesor puede impartir varios módulos de Ciclos diferentes.
Registro nombre de alumnos.
Un alumno está matriculado en un Ciclo.
Un alumno puede no estar matriculado en todos los módulos de un Ciclo.
Los alumnos están agrupados en proyectos.
Registro una rúbrica que corrige un módulo de un ciclo concreto que diseña un profesor.
La rúbrica contiene items y niveles.
Los niveles de una rúbrica pueden ser variables según el diseño del profesor.
Los profesores de un ciclo corregirán a cada alumno. Cada profesor corrige su módulo. Y se almacena alumno y nota por módulo.

---

## Aclaraciones (sesión /db-schema-designer — 2026-06-08)

### Alumno — identificación

- El campo de identificación del alumno es `nombre` (texto libre). El profesor decide si
  introduce el nombre real o un código anonimizado (p. ej. JJ499). El sistema no impone
  formato. No existe un campo `codigo` separado.

### Admin — rol en la BD

- Existe un rol **Admin** con pantalla y permisos propios (gestiona legislaciones, ciclos,
  módulos y profesorado). Se representa como un tercer valor del ENUM `rol` en la tabla
  `profesor`: `'admin' | 'profesor' | 'tutor'`. Un admin nunca tiene `tutor_ciclo_id`
  asignado ni entradas en `profesor_modulo`.

### Rúbrica y temporal

- Un módulo puede tener **rúbricas distintas en años académicos diferentes** (el profesor
  puede cambiar o ser otro cada año). Una rúbrica está asociada a un módulo + año académico.
  Constraint: UNIQUE(modulo_id, academic_year) en `rubrica`.

### Alumno ↔ Proyecto ↔ Módulo

- Un alumno puede pertenecer a **un único proyecto por año académico**. Puede existir en
  proyectos de años distintos con el mismo nombre (son proyectos distintos).
  Constraint: UNIQUE(alumno_id, año_académico) en la tabla de inscripción alumno-proyecto.
- La **matrícula de un alumno en un módulo es explícita**: la gestiona el profesor
  (no se deriva del proyecto). Existe una tabla de inscripción alumno-módulo independiente.

### Profesor ↔ Ciclo — constraint crítico

- Un ciclo puede tener **0 o 1 tutor**; nunca más de uno.
- Un ciclo se crea inicialmente sin tutor (0), pero **no puede usarse para corregir** hasta
  que tenga un tutor asignado.
- Un profesor puede ser tutor de **como máximo un ciclo** (la unicidad es del lado del profesor,
  no del ciclo).
- El ciclo se crea primero, sin tutor. El tutor se asigna al crear o editar un profesor.
- **No existe relación directa ciclo → profesor.** El vínculo es siempre
  `ciclo → módulo → profesor` (a través de los módulos que imparte cada profesor).

### Rúbrica — estructura de puntuación

- La rúbrica es una **matriz ítem × nivel**: cada celda tiene su propio valor numérico
  independiente. No todos los ítems comparten los mismos valores por nivel.
- El flujo de corrección es: el profesor **selecciona un nivel por cada ítem**; el sistema
  suma los valores de los niveles seleccionados y **pondera el resultado a 10** como valor
  máximo (normalización automática).
- Se guarda el **desglose por ítem** de cada corrección (qué nivel fue asignado a cada ítem
  para cada alumno), de modo que la nota final pueda recalcularse en cualquier momento.
