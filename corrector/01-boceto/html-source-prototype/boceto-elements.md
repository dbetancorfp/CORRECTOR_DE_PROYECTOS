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

> ⚠️ **Corregido 2026-07-12**: esta sección describía IDs 46–57 como
> reutilizados literalmente entre los tres tabs de Gestión, y el
> "CONFLICTO DE IDs" con Rúbrica. Ninguna de las dos afirmaciones es cierta:
> `grep -o 'data-element-id="[0-9]*"'` sobre cada HTML real confirma que cada
> tab tiene su propio rango contiguo sin solapes: Alumnos #48–60, Proyectos
> #61–72, Asignación #73–85+#121, Rúbrica #86–100. `ui-spec.json` /
> `functional-spec.json` / `use-cases.md` (UC-06 a UC-09) ya usaban la
> numeración real y estaban de acuerdo entre sí — solo este fichero
> arrastraba el esquema erróneo de "elementos compartidos". Sección de
> Alumnos corregida abajo; Proyectos/Asignación/Rúbrica pendientes de la
> misma pasada cuando se implementen esas pantallas.

---

## vista_profesor_landing-gestionar_tab_Alumnos_seleccionado.html — Profesor · Tab Alumnos

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 48 | Campo nombre (formulario alta) | input texto | Nombre o código del alumno a crear — texto libre, sin formato impuesto |
| 49 | Selector año inicio (formulario alta) | select | Año de inicio del curso académico — ayuda de navegación, no se persiste directamente |
| 50 | Selector legislación (formulario alta) | select | Legislación aplicable, filtrada por #49 |
| 51 | Selector ciclo (formulario alta) | select | Ciclo formativo, filtrado por #50 — se persiste como `student.cycle_id` |
| 52 | Selector módulo (formulario alta) | select | Módulo del ciclo, filtrado por #51 — se persiste vía `student_module` |
| 53 | Botón Nuevo | botón | Persiste el nuevo alumno con los datos del formulario #48–#52 |
| 54 | Botón Subir lista de alumnos | botón | Importación masiva desde fichero CSV/JSON/YAML |
| 55 | Filtro por nombre | input texto | Filtro reactivo (debounce 300 ms) sobre el listado #60 |
| 56 | Filtro por año (listado) | select | Acota el listado #60 por año de inicio del curso |
| 57 | Filtro por legislación (listado) | select | Acota el listado #60 por legislación |
| 58 | Filtro por ciclo (listado) | select | Acota el listado #60 por ciclo formativo, filtrado por #57 |
| 59 | Filtro por módulo (listado) | select | Acota el listado #60 por módulo, filtrado por #58 |
| 60 | Tabla de alumnos | tabla | Lista alumnos con columnas: Nombre, Módulo, Ciclo, Legislación, Año inicio, Editar, Borrar |

---

## vista_profesor_landing-gestionar_tab_Proyectos_seleccionado.html — Profesor · Tab Proyectos

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 61 | Campo nombre (formulario alta) | input texto | Nombre del proyecto a crear |
| 62 | Selector año inicio (formulario alta) | select | Año de inicio del curso académico — ayuda de navegación; se convierte a `academic_year` (YYYY-YYYY) al guardar |
| 63 | Selector legislación (formulario alta) | select | Legislación aplicable, filtrada por #62 |
| 64 | Selector ciclo (formulario alta) | select | Ciclo formativo, filtrado por #63 — ayuda de navegación; `project` no tiene `cycle_id` propio (se infiere vía alumnos asignados) |
| 65 | Selector módulo (formulario alta) | select | Módulo del ciclo, filtrado por #64 — se persiste como `project.module_id` |
| 66 | Botón Nuevo | botón | Persiste el nuevo proyecto con los datos del formulario #61–#65 |
| 67 | Filtro por nombre | input texto | Filtro reactivo (debounce 300 ms) sobre el listado #72 |
| 68 | Filtro por año (listado) | select | Acota el listado #72 por año de inicio (derivado de `academic_year`) |
| 69 | Filtro por legislación (listado) | select | Acota el listado #72 por legislación |
| 70 | Filtro por ciclo (listado) | select | Acota el listado #72 por ciclo formativo, filtrado por #69 |
| 71 | Filtro por módulo (listado) | select | Acota el listado #72 por módulo, filtrado por #70 |
| 72 | Tabla de proyectos | tabla | Lista proyectos con columnas: Nombre, Módulo, Ciclo, Legislación, Año inicio, Editar, Borrar |

---

## vista_profesor_landing-gestionar_tab_AsignacionesPytoAlumn_seleccionado.html — Profesor · Tab Asignación Proyecto-Alumno

> **Decisión de usuario 2026-07-12**: los botones Editar/Borrar de la fila en
> #85 operan sobre el proyecto (igual que en #72, Proyectos) — Editar
> renombra, Borrar elimina el proyecto (bloqueado si tiene alumnos
> asignados). La desasignación de un alumno concreto se hace con un botón
> "Quitar" junto a su nombre dentro del panel #84, no borrando la fila de #85.

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 73 | Filtro por proyecto (nombre) | input texto | Filtro reactivo (debounce 300 ms) sobre la tabla #85 |
| 74 | Filtro por año (proyecto) | select | Acota #85 por año de inicio |
| 75 | Filtro por legislación (proyecto) | select | Acota #85 por legislación |
| 76 | Filtro por ciclo (proyecto) | select | Acota #85 por ciclo, filtrado por #75 |
| 77 | Filtro por módulo (proyecto) | select | Acota #85 por módulo, filtrado por #76 |
| 78 | Filtro por nombre (alumno) | input texto | Filtro reactivo (debounce 300 ms) sobre el pool de candidatos de #84 |
| 79 | Filtro por año (alumno) | select | Acota el pool de #84 por año de inicio |
| 80 | Filtro por legislación (alumno) | select | Acota el pool de #84 por legislación |
| 81 | Filtro por ciclo (alumno) | select | Acota el pool de #84 por ciclo, filtrado por #80 |
| 82 | Filtro por módulo (alumno) | select | Acota el pool de #84 por módulo, filtrado por #81 |
| 83 | Panel Proyecto seleccionado | texto de solo lectura | Nombre del proyecto seleccionado al hacer clic en una fila de #85; vacío si no hay selección |
| 84 | Panel Alumnos | fieldset | Lista de alumnos ya asignados al proyecto seleccionado (con botón "Quitar") + candidatos del pool filtrado (con checkbox de selección) |
| 85 | Tabla de proyectos | tabla | Mismas columnas y acciones que #72 (Nombre, Módulo, Ciclo, Legislación, Año inicio, Editar, Borrar); clic en fila selecciona el proyecto para #83/#84 |
| 121 | Botón Agregar alumnos | botón | Asigna los candidatos marcados en #84 al proyecto seleccionado en #83; activo solo cuando ambos paneles tienen selección; máx. 3 alumnos por proyecto |

---

## vista_profesor_landing-gestionar_tab_Rubrica_seleccionado.html — Profesor · Tab Rúbrica

> Corregido 2026-07-12. La numeración anterior (#52–64, #90) era inventada —
> ninguno de esos IDs aparece en el HTML real. También se eliminó "#64
> Puntuación máxima": ese elemento no existe en el boceto (ni en
> `ui-spec.json`/`functional-spec.json`); el límite de 10 puntos en Excelente
> se comunica solo como error al guardar, no como un contador visible.

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 86 | Filtro por nombre de módulo | input texto | Filtro reactivo (debounce 300 ms); acota las opciones de #90, pese a que el placeholder del boceto dice "Filtrar por proyecto" |
| 87 | Selector año inicio | select | Ayuda de navegación; determina el `academic_year` de la rúbrica (`año-año+1`) |
| 88 | Selector legislación | select | Filtrado por #87 |
| 89 | Selector ciclo | select | Filtrado por #88 |
| 90 | Selector módulo | select | Filtrado por #89; al seleccionar carga la rúbrica de ese módulo en #100 |
| 91 | Botón Nuevo nivel | botón | Añade la siguiente columna de nivel al builder #92 (orden canónico: Excelente, Muy bien, Bien, Regular, Mal); deshabilitado al llegar a 5 |
| 92 | Tabla builder (nuevo ítem) | tabla editable | Fila única para construir un ítem antes de guardarlo; se vacía tras #98 |
| 93 | Celda nombre del ítem | celda editable | Descripción del criterio, dentro de #92 |
| 94 | Celda Excelente | celda editable | Valor numérico, dentro de #92 |
| 95 | Celda Bien | celda editable | Valor numérico, dentro de #92; no debe superar el valor de Excelente |
| 96 | Celda Mal | celda de solo lectura | Siempre 0 — invariante de dominio, no editable |
| 97 | Icono Borrar (builder) | botón | Vacía la fila del builder #92 sin confirmación (ítem aún no guardado) |
| 98 | Botón Añadir item | botón | Guarda el ítem del builder en la rúbrica del módulo seleccionado; valida que la suma de Excelente no supere 10 |
| 99 | Botón Subir rúbrica | input file | Importa una rúbrica completa desde CSV/JSON/YAML; pide confirmación si el módulo ya tiene rúbrica |
| 100 | Tabla de rúbrica completa | tabla | Todos los ítems guardados del módulo seleccionado, con Editar/Borrar; muestra las 5 columnas de nivel aunque un ítem solo tenga 3 |

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

> Corregido 2026-07-12. La numeración anterior (#65–80) era inventada — mismo
> patrón de desfase que en el resto de pantallas de Profesor. `ui-spec.json`/
> `functional-spec.json`/`use-cases.md` (UC-09) ya usaban la numeración real.
> El boceto muestra dos tablas de corrección (#110 de 5 niveles y #111 de 3)
> para ilustrar que los ítems pueden tener distinto número de niveles, pero
> `functional-spec.json` indica explícitamente que la implementación real usa
> **una sola tabla con columnas dinámicas** (#110) — #111 no se renderiza
> como tabla separada.

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 101 | Selector año | select | Ayuda de navegación para acotar los proyectos mostrados en #105 |
| 102 | Selector legislación | select | Filtrado por #101 |
| 103 | Selector ciclo | select | Filtrado por #102 |
| 104 | Selector módulo | select | Filtrado por #103; si el módulo no tiene rúbrica, corrección bloqueada |
| 105 | Selector proyecto | select | Filtrado por #104; al seleccionar carga la rúbrica y los alumnos asignados |
| 106 | Checkbox Corregir por grupo | checkbox | Aplica la nota a todos los alumnos del proyecto; deshabilita #107–#109 |
| 107 | Checkbox Alumno 1 | checkbox | Selección individual para corrección diferenciada |
| 108 | Checkbox Alumno 2 | checkbox | Solo se renderiza si el proyecto tiene ≥ 2 alumnos |
| 109 | Checkbox Alumno 3 | checkbox | Solo se renderiza si el proyecto tiene 3 alumnos |
| 110 | Tabla de corrección | tabla | Un ítem por fila, columnas dinámicas según los niveles de cada ítem; clic en celda selecciona el nivel |
| 112 | Puntuación obtenida en la rúbrica | párrafo de solo lectura | Suma de los valores de nivel seleccionados; se recalcula en tiempo real |
| 113 | Puntuación obtenida sobre 10 | párrafo de solo lectura | `(puntuación obtenida / suma de Excelente) × 10`, redondeado a 2 decimales |
