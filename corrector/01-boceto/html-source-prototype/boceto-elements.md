# Boceto Elements — Corrector de Proyectos

Referencia de todos los elementos anotados con `data-element-id` en los prototipos HTML.
Usar durante la entrevista de cliente para referenciar elementos concretos por número.

---

## index.html — Login

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 1 | Campo usuario | input texto | Identifica al usuario que inicia sesión |
| 2 | Campo contraseña | input password | Credencial de acceso del usuario |
| 3 | Botón Acceder | botón submit | Valida credenciales y redirige según rol (Admin / Profesor / Tutor) |

---

## vista_admin-tab_legislacion_seleccionado.html — Admin · Tab Legislación

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 4 | Tab Legislación | botón (tab) | Cambia la vista de Gestión al tab de Legislación |
| 5 | Campo Nombre/Siglas legislación | input texto | Nombre o abreviatura de la legislación (ej. LOMLOE) |
| 6 | Campo año de inicio | input texto | Año de entrada en vigor de la legislación |
| 7 | Botón Guardar | botón submit | Persiste la nueva legislación introducida en los campos 5 y 6 |
| 8 | Filtro por año de inicio | input texto (reactivo) | Filtra la tabla #10 por año de inicio, con debounce de 300 ms |
| 9 | Filtro por siglas/nombre | input texto (reactivo) | Filtra la tabla #10 por siglas o nombre, con debounce de 300 ms |
| 10 | Tabla de legislaciones | tabla | Lista todas las legislaciones existentes (año inicio, nombre) con iconos de editar y borrar por fila; filtrada por #8 y #9 |

---

## vista_admin-tab_ciclos_seleccionado.html — Admin · Tab Ciclos

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 11 | Nav (⚠️ ver conflicto abajo) | nav | Etiquetado en el HTML sobre el `<nav>` completo, no sobre un botón concreto |
| 12 | Tab Ciclos | botón (tab) | Cambia la vista de Gestión al tab de Ciclos |
| 13 | Campo Nombre del ciclo | input texto | Nombre del ciclo a crear (único, 3–100 caracteres) |
| 14 | Selector año (navegación) | select | Filtra las opciones de #15 por año; NO se persiste en el ciclo |
| 15 | Selector legislación (navegación) | select | Filtrado por #14; NO se persiste en el ciclo — la legislación vive en los módulos, no en el ciclo |
| 16 | Botón Guardar | botón submit | Persiste únicamente el nombre del ciclo (campo #13) |
| 17 | Filtro por año de inicio | input texto (reactivo) | Filtra la tabla #20 vía JOIN módulos→legislación, debounce 300 ms |
| 18 | Filtro por legislación | input texto (reactivo) | Filtra la tabla #20 vía JOIN módulos→legislación, debounce 300 ms |
| 19 | Filtro por nombre de ciclo | input texto (reactivo) | Filtra la tabla #20 por nombre, debounce 300 ms |
| 20 | Tabla de ciclos | tabla | Lista todos los ciclos (nombre) con iconos de editar y borrar por fila; filtrada por #17, #18, #19 |
| 21 | Columna "Año finalización" (⚠️ no implementada) | cabecera columna | El boceto la mockea como `start_year + 1`, pero `cycle` no tiene `start_year` (schema.sql: solo `id, name, created_at`) — decisión explícita del usuario 2026-07-12: columna omitida en la implementación real |

> **⚠️ CONFLICTO #11**: coincide con el ya documentado en `use-cases.md` (UC-01, botón
> Salir) y con `uc-01-login.cy.ts` (`data-element-id="11"` esperado como logout). El
> HTML real lo pone en el `<nav>`, no en un botón. Decisión del usuario (sesión
> Legislación, 2026-07-12): sidestep temporal usando `data-action="logout"` en la
> implementación en vez de depender de `#11`. Sin resolver a nivel de sketchNumbers.

---

## vista_admin-tab_modulos_seleccionado.html — Admin · Tab Módulos

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 22 | Tab Módulos | botón (tab) | Cambia la vista de Gestión al tab de Módulos |
| 23 | Campo Nombre del módulo | input texto | Nombre del módulo a crear (3–100 caracteres) |
| 24 | Campo Horas semanales | input texto | Horas semanales del módulo (entero 1–30); usado en la fórmula de nota final |
| 25 | Selector legislación | select | Legislación del módulo (FK real, `legislation_id`); al elegir, actualiza #26 |
| 26 | Selector año | select | Año de la legislación elegida en #25 (no se persiste por separado — ver nota) |
| 27 | Selector ciclo | select | Ciclo del módulo (FK real, `cycle_id`); deshabilitado hasta que #25 y #26 tienen valor; opciones filtradas a ciclos que ya tienen algún módulo bajo la legislación elegida (`GET /api/cycles?legislationId=`) |
| 28 | Botón Guardar | botón submit | Persiste name, weekly_hours, legislation_id (#25) y cycle_id (#27) — #26 no se envía |
| 29 | Filtro por año | input texto (reactivo) | Filtra la tabla #33 por año de la legislación del módulo, debounce 300 ms |
| 30 | Filtro por legislación | input texto (reactivo) | Filtra la tabla #33 por abreviatura de legislación, debounce 300 ms |
| 31 | Filtro por ciclo | input texto (reactivo) | Filtra la tabla #33 por nombre de ciclo, debounce 300 ms |
| 32 | Filtro por nombre de módulo | input texto (reactivo) | Filtra la tabla #33 por nombre de módulo, debounce 300 ms |
| 33 | Tabla de módulos | tabla | Nombre, ciclo, año, legislación, horas semanales, editar y borrar; filtrada por #29–#32 |

> **Limitación conocida y aceptada #27**: al filtrar a "ciclos que ya tienen un
> módulo bajo la legislación elegida", no es posible crear desde esta pantalla el
> primer módulo de una combinación ciclo+legislación totalmente nueva (un ciclo sin
> ningún módulo previo no aparecerá en #27 para ninguna legislación). Decisión
> explícita del usuario (2026-07-12): implementar el filtro tal cual lo especifica
> `functional-spec.json`/`use-cases.md` (UC-04) y aceptar esta limitación en vez de
> relajarla.

---

## vista_admin-tab_profesorado_seleccionado.html — Admin · Tab Profesorado

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 34 | Tab Profesorado | botón (tab) | Cambia la vista de Gestión al tab de Profesorado |
| 35 | Campo Nombre de usuario | input texto | Usuario Consejería del profesor (4–20 caracteres, único) |
| 36 | Campo Contraseña | input password | Contraseña inicial (mín. 8 caracteres); se guarda hasheada, nunca en claro |
| 37 | Selector año (navegación) | select | Filtra las opciones de #38; NO se persiste |
| 38 | Selector legislación (navegación) | select | Filtrado por #37; filtra las opciones de #39; NO se persiste |
| 39 | Selector ciclo (navegación) | select | Deshabilitado hasta que #37 y #38 tienen valor; filtra las opciones de #40; NO se persiste |
| 40 | Selector módulo | select | Deshabilitado hasta que #39 tiene valor; único campo realmente asignado (`teacher_module`) |
| 41 | Botón Guardar | botón submit | Crea el profesor (`role='profesor'`, `must_change_password=true`) y lo enlaza a #40 |
| 42 | Filtro por año | input texto (reactivo) | Filtra la tabla #46 vía `teacher_module` → `module` → `legislation.start_year`, debounce 300 ms |
| 43 | Filtro por legislación | input texto (reactivo) | Filtra la tabla #46 vía `teacher_module` → `module` → `legislation`, debounce 300 ms |
| 44 | Filtro por ciclo | input texto (reactivo) | Filtra la tabla #46 vía `teacher_module` → `module` → `cycle.name`, debounce 300 ms |
| 45 | Filtro por módulo | input texto (reactivo) | Filtra la tabla #46 vía `teacher_module` → `module.name`, debounce 300 ms |
| 46 | Tabla de profesorado | tabla | Usuario, contraseña (`12345678` si `must_change_password`, si no `********`), año, ciclo, módulos, editar, borrar; filtrada por #42–#45; incluye acción de desbloqueo cuando la cuenta está bloqueada |

> **Nota**: `api-contracts.md` documentaba `role`/`tutorCycleId` en el body de
> `POST /api/teachers` y `moduleId` en `PUT /api/teachers/:id` — ninguno de los
> dos existe en `TeacherService` (crea siempre `role='profesor'`, sin selector
> en el boceto ni criterio de aceptación en `functional-spec.json` #41; el
> `update()` del repositorio solo toca `username`). Corregido en
> `api-contracts.md` para reflejar el contrato real. También documentaba
> `POST /api/teachers/:id/reset-password`, que tampoco existe (ni ruta ni
> método de servicio) — sin criterio de aceptación que lo requiera en esta
> pantalla (#46 solo pide desbloqueo), se deja fuera de alcance.

---

## vista_profesor-landing.html — Landing Profesor

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 47 | Botón Imprimir notas | botón | Visible exclusivamente para el rol Tutor; accede a la impresión de notas |

---

## Elementos compartidos — Tabs Gestión (Alumnos · Proyectos · Asignación)

Los IDs 46–57 aparecen en los tres tabs de Gestión del profesor representando los mismos
controles de formulario y filtro. El contexto semántico (alumno vs. proyecto) varía por tab.

> ⚠️ **CONFLICTO DE IDs**: Los IDs 52–58 también aparecen en el tab Rúbrica (elementos distintos).
> Es necesario renumerar antes de avanzar en el pipeline.

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 46 | Campo nombre (formulario alta) | input texto | Nombre del alumno o proyecto a crear |
| 47 | Selector año inicio (formulario alta) | select | Año de inicio del curso académico |
| 48 | Selector legislación (formulario alta) | select | Legislación aplicable (LOE, LOMLOE…) |
| 49 | Selector ciclo (formulario alta) | select | Ciclo formativo, filtrado por legislación |
| 50 | Selector módulo (formulario alta) | select | Módulo del ciclo, filtrado por ciclo |
| 51 | Botón Nuevo | botón | Persiste el nuevo alumno o proyecto con los datos del formulario |
| 52 | Botón Subir lista | botón | Importación masiva desde fichero (CSV / Excel) — sólo en tab Alumnos |
| 53 | Filtro por nombre/proyecto | input texto | Filtro reactivo sobre el listado |
| 54 | Filtro por año (listado) | select | Acota el listado por año de inicio del curso |
| 55 | Filtro por legislación (listado) | select | Acota el listado por legislación |
| 56 | Filtro por ciclo (listado) | select | Acota el listado por ciclo formativo |
| 57 | Filtro por módulo (listado) | select | Acota el listado por módulo |

---

## vista_profesor_landing-gestionar_tab_Alumnos_seleccionado.html — Profesor · Tab Alumnos

> Usa los elementos compartidos 46–57. Elementos propios:

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 58 | Tabla de alumnos | tabla | Lista alumnos con columnas: Nombre, Módulo, Ciclo, Legislación, Año inicio, Editar, Borrar |

---

## vista_profesor_landing-gestionar_tab_Proyectos_seleccionado.html — Profesor · Tab Proyectos

> Usa los elementos compartidos 46–57. Elementos propios:

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 47 | Tabla de proyectos | tabla | Lista proyectos con columnas: Nombre, Módulo, Ciclo, Legislación, Año inicio, Editar, Borrar |

---

## vista_profesor_landing-gestionar_tab_AsignacionesPytoAlumn_seleccionado.html — Profesor · Tab Asignación Proyecto-Alumno

> Usa los elementos de filtro compartidos 53–57. Elementos propios:

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 47 | Tabla de asignaciones | tabla | Lista proyectos con alumnos asignados: Nombre, Módulo, Ciclo, Legislación, Año inicio, Editar, Borrar |
| 121 | Botón Agregar alumnos | botón | Confirma la asignación del alumno seleccionado en #84 al proyecto seleccionado en #83; activo solo cuando ambos paneles tienen selección |

---

## vista_profesor_landing-gestionar_tab_Rubrica_seleccionado.html — Profesor · Tab Rúbrica

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 52 | Tab Rúbrica | botón | Activa la vista de gestión de rúbrica (estado seleccionado) |
| 53 | Filtro por proyecto | input texto | Filtro reactivo: muestra la rúbrica del proyecto buscado |
| 54 | Filtro por año | input texto | Filtro reactivo: reduce resultados por año académico |
| 55 | Botón Nuevo | botón | Añade un nuevo ítem a la rúbrica del proyecto activo |
| 56 | Tabla de rúbrica | tabla | Grid de ítems × niveles de calificación (Excelente, Muy bien, Bien, Regular, Mal) |
| 57 | Celda Nombre del ítem | celda editable | Descripción del criterio de evaluación |
| 58 | Celda Excelente | celda editable | Valor numérico para la calificación Excelente |
| 59 | Celda Muy bien | celda editable | Valor numérico para la calificación Muy bien |
| 60 | Celda Bien | celda editable | Valor numérico para la calificación Bien |
| 61 | Celda Regular | celda editable | Valor numérico para la calificación Regular |
| 62 | Celda Mal | celda editable | Valor numérico para la calificación Mal |
| 63 | Botón Subir rúbrica | botón | Importa una rúbrica completa desde fichero |
| 64 | Puntuación máxima | párrafo | Muestra la suma total máxima posible de la rúbrica (calculada automáticamente) |
| 90 | Icono Borrar (ítem rúbrica) | celda | Elimina la fila del ítem de la rúbrica |

---

## vista_profesor-landing-ver_notas.html — Ver Notas (nuevo boceto)

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 85 | Filtro año académico | select | Selector de año de inicio del curso; filtra los ciclos disponibles en #86 |
| 86 | Filtro ciclo | select | Selector de ciclo, enlazado a #85; filtra los módulos disponibles en #87 |
| 87 | Filtro módulo | select | Selector de módulo asignado al profesor, enlazado a #86 |
| 88 | Botón Descarga PDF | botón | Genera y descarga el PDF con los datos filtrados por #85, #86 y #87 |
| 89 | Tabla de resultados | tabla | Vista previa del PDF: columnas Proyecto, Nombre alumno, Niveles evaluados, Nota final |
| 122 | Labels estado por módulo | párrafo | Grupo de badges por módulo: fondo verde si todos los alumnos tienen corrección, rojo si falta al menos uno; aparece entre los filtros y la tabla #119 |

---

## vista_profesor_landing-corregirProyecto.html — Corregir Proyecto

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 65 | Filtro por año | input texto | Filtro reactivo: acota los proyectos por año académico |
| 66 | Filtro por ciclo | input texto | Filtro reactivo: acota los proyectos por ciclo |
| 67 | Filtro por módulo | input texto | Filtro reactivo: acota los proyectos por módulo |
| 68 | Desplegable proyecto | desplegable | Selecciona el proyecto concreto a corregir |
| 69 | Tabla de corrección | tabla | Muestra la rúbrica del proyecto seleccionado para puntuar cada ítem |
| 70 | Celda Nombre del ítem | celda | Nombre del criterio de evaluación (solo lectura en corrección) |
| 71 | Celda Excelente | celda seleccionable | Selecciona la calificación Excelente para ese ítem |
| 72 | Celda Muy bien | celda seleccionable | Selecciona la calificación Muy bien para ese ítem |
| 73 | Celda Bien | celda seleccionable | Selecciona la calificación Bien para ese ítem |
| 74 | Celda Regular | celda seleccionable | Selecciona la calificación Regular para ese ítem |
| 75 | Celda Mal | celda seleccionable | Selecciona la calificación Mal para ese ítem |
| 76 | Puntuación obtenida | párrafo | Muestra la nota final calculada sumando los ítems seleccionados |
| 77 | Checkbox Corregir por grupo | checkbox | Activa el modo corrección grupal (la nota se aplica a todos los alumnos del grupo) |
| 78 | Checkbox Alumno 1 | checkbox | Selecciona individualmente al alumno 1 para corrección diferenciada |
| 79 | Checkbox Alumno 2 | checkbox | Selecciona individualmente al alumno 2 para corrección diferenciada |
| 80 | Checkbox Alumno 3 | checkbox | Selecciona individualmente al alumno 3 para corrección diferenciada |
