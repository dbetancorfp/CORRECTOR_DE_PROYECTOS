# Casos de Uso — Corrector de Proyectos

**Feature**: corrector-v1  
**Agente**: 5 — Arquitecto de Requisitos  
**Generado**: 2026-06-28  
**Fuente**: functional-spec.json (122 elementSpecs · 26 globalRules) + reconciliation.json (valid: true)

---

## Índice

| ID | Flujo | Elementos | Actor |
|----|-------|-----------|-------|
| UC-01 | Login, logout y gestión de sesión | #1, #2, #3, #11 | Todos |
| UC-02 | Gestión de Legislaciones | #4–#10 | Admin |
| UC-03 | Gestión de Ciclos | #12–#21 | Admin |
| UC-04 | Gestión de Módulos | #22–#33 | Admin |
| UC-05 | Gestión de Profesorado | #34–#46 | Admin |
| UC-06 | Gestión de Alumnos | #48–#60 | Profesor |
| UC-07 | Gestión de Proyectos | #61–#72 | Profesor |
| UC-07b | Asignación Proyecto-Alumno | #73–#85, #121 | Profesor |
| UC-08 | Gestión de Rúbrica | #86–#100 | Profesor |
| UC-09 | Corrección de Proyecto | #101–#113 | Profesor |
| UC-10 | Visualización e impresión de Notas | #47, #114–#120, #122 | Profesor / Tutor |

**Total cubierto**: 122 elementos (incluyendo #121 y #122)

---

## UC-01: Login, logout y gestión de sesión

**Actor principal**: Todos los roles (admin, profesor, tutor)  
**Precondiciones**: Usuario no autenticado; cuenta existente en la BD  
**Elementos del boceto**: #1 (campo usuario), #2 (campo contraseña), #3 (botón Acceder), #11 (nav bar / botón Salir)  
**Fase RAG**: use-case

### Flujo principal

1. El usuario accede a la ruta `/`.
2. Introduce su nombre de usuario Consejería en el campo #1.
3. Introduce su contraseña en el campo #2 (siempre enmascarada).
4. Pulsa el botón Acceder (#3) o presiona Enter en cualquier campo.
5. El sistema valida las credenciales contra la BD; restablece `failed_login_attempts` a 0.
6. Si `must_change_password = false`, el sistema crea la sesión y redirige a `/admin` (rol admin) o `/profesor` (rol profesor o tutor).
7. El usuario trabaja en la aplicación.
8. Al pulsar 'Salir' (#11), la sesión se destruye y el usuario es redirigido a `/`.

### Flujos alternativos

- **A1 — Credenciales inválidas**: El sistema muestra 'Credenciales incorrectas' en la misma pantalla e incrementa `failed_login_attempts`.
- **A2 — Cuenta bloqueada (profesor/tutor)**: Tras el 3.er intento fallido, `account_locked = true`; se muestra 'Póngase en contacto con el Administrador'.
- **A3 — Cuenta bloqueada (admin)**: Igual que A2 pero el mensaje es 'Póngase en contacto con el soporte técnico'.
- **A4 — Primer acceso (contraseña por defecto '12345678')**: El sistema detecta `must_change_password = true` y muestra campos de cambio de contraseña inline en la misma pantalla. La redirección ocurre únicamente tras el cambio exitoso. Si las contraseñas no coinciden, muestra error y el usuario permanece en la pantalla de login.
- **A5 — Expiración automática de sesión**: Tras 10 minutos de inactividad, la sesión se cierra automáticamente sin diálogo de confirmación y el usuario es redirigido a `/`.

### Postcondiciones

- Sesión activa para el usuario autenticado con el rol correspondiente.
- `failed_login_attempts` restablecido a 0 en login exitoso.
- `must_change_password` establecido a `false` tras el cambio exitoso de contraseña.

### Criterios de aceptación

- [ ] Dado usuario y contraseña válidos de admin, se redirige a `/admin`
- [ ] Dado usuario y contraseña válidos de profesor o tutor, se redirige a `/profesor`
- [ ] Dado credenciales inválidas, se muestra 'Credenciales incorrectas'
- [ ] Dado 3.er intento fallido de profesor/tutor, cuenta bloqueada con mensaje de Administrador
- [ ] Dado 3.er intento fallido de admin, cuenta bloqueada con mensaje de soporte técnico
- [ ] Dado `must_change_password = true`, aparecen campos inline de cambio de contraseña
- [ ] Dado contraseñas de cambio coincidentes, contraseña actualizada y usuario redirigido
- [ ] Dado contraseñas de cambio no coincidentes, error mostrado y usuario en pantalla de login
- [ ] Dado 'Salir' pulsado, sesión destruida y usuario redirigido a `/` sin diálogo
- [ ] Dado 10 minutos de inactividad, sesión cerrada y usuario redirigido a `/`
- [ ] El campo de contraseña siempre enmascara los caracteres

---

## UC-02: Gestión de Legislaciones

**Actor principal**: Admin  
**Precondiciones**: Usuario autenticado con `role = 'admin'`; en ruta `/admin/legislacion`  
**Elementos del boceto**: #4 (tab Legislación), #5 (siglas), #6 (año inicio), #7 (Guardar), #8 (filtro por año), #9 (filtro por siglas), #10 (tabla de legislaciones)  
**Fase RAG**: use-case

### Flujo principal

1. El admin hace clic en el tab Legislación (#4); la ruta cambia a `/admin/legislacion`.
2. La tabla #10 carga todas las legislaciones existentes.
3. El admin introduce las siglas (ej. 'LOMLOE') en el campo #5 y el año de inicio en #6.
4. Pulsa Guardar (#7).
5. El sistema valida los datos y persiste la nueva legislación en la BD.
6. La nueva fila aparece en la tabla #10 sin recarga de página.
7. El formulario se limpia para la siguiente entrada.

### Flujos alternativos

- **A1 — Siglas duplicadas**: El sistema rechaza la operación y muestra 'already exists'.
- **A2 — Formulario inválido**: El botón #7 permanece deshabilitado o muestra errores de validación (campo vacío, formato incorrecto).
- **A3 — Edición inline**: El admin pulsa el icono de edición en una fila de #10; los campos de la fila se vuelven editables y el botón cambia a 'Guardar'.
- **A4 — Borrar con módulos dependientes**: El sistema bloquea la eliminación y muestra un mensaje de error; el admin debe eliminar los módulos asociados primero.
- **A5 — Filtrado**: El admin escribe en #8 (por año) o #9 (por siglas); la tabla #10 filtra en tiempo real con debounce de 300 ms.

### Postcondiciones

- Nueva legislación persiste en la BD con `id`, `name`, `start_year`.
- Tabla #10 refleja el estado actualizado sin recarga.

### Criterios de aceptación

- [ ] Dado tab #4 pulsado, ruta cambia a `/admin/legislacion` y tab muestra estado seleccionado
- [ ] Dado formulario válido, nueva legislación aparece en #10 tras Guardar
- [ ] Dado siglas duplicadas, operación rechazada con mensaje de error
- [ ] Dado campo vacío al enviar, estado de error mostrado
- [ ] Dado siglas en minúsculas, error mostrado (patrón `^[A-Z]{2,10}$`)
- [ ] Dado edición confirmada, cambios persisten y tabla se actualiza sin recarga
- [ ] Dado borrado sin módulos dependientes, fila eliminada tras confirmación
- [ ] Dado borrado con módulos dependientes, eliminación bloqueada con mensaje informativo
- [ ] Dado texto en #8 o #9, la tabla filtra en tiempo real (≤ 300 ms)
- [ ] Dado tabla vacía, se muestra estado vacío

---

## UC-03: Gestión de Ciclos

**Actor principal**: Admin  
**Precondiciones**: Autenticado como admin; al menos una legislación existente  
**Elementos del boceto**: #12 (tab Ciclos), #13 (nombre ciclo), #14 (selector año), #15 (selector legislación), #16 (Guardar), #17 (filtro año), #18 (filtro legislación), #19 (filtro nombre), #20 (tabla ciclos), #21 (columna Año finalización — no implementada, ver nota)  
**Fase RAG**: use-case

> **Nota #21**: el boceto mockea una columna "Año finalización" = `start_year + 1`,
> pero `cycle` no tiene `start_year` (`schema.sql`: solo `id, name, created_at`) —
> la legislación vive en los módulos, no en el ciclo, así que un "año de
> finalización" único por ciclo no está bien definido. Decisión explícita del
> usuario (2026-07-12): columna omitida de la implementación real.

### Flujo principal

1. El admin pulsa el tab Ciclos (#12); la ruta cambia a `/admin/ciclos`.
2. La tabla #20 carga todos los ciclos (nombre únicamente).
3. El admin introduce el nombre del ciclo en #13.
4. Selecciona un año en #14 (para filtrar la legislación, sin persistir en el ciclo) y una legislación en #15 (también solo navegación).
5. Pulsa Guardar (#16).
6. El sistema persiste únicamente el nombre del ciclo (sin `legislation_id` ni año).
7. Nueva fila aparece en #20 sin recarga.

### Flujos alternativos

- **A1 — Nombre duplicado**: Rechazado con error.
- **A2 — Cascada de filtros de navegación**: Seleccionar #14 filtra las opciones de #15. Estas selecciones NO se persisten en el ciclo.
- **A3 — Filtrado de tabla**: Los filtros #17 (año), #18 (legislación) y #19 (nombre) filtran #20 en tiempo real. Los filtros #17 y #18 requieren JOIN a través de módulos → legislación.
- **A4 — Borrar con módulos**: Eliminación bloqueada; el admin debe eliminar los módulos del ciclo primero.

### Postcondiciones

- Ciclo persiste con `id` y `name` únicamente.
- La legislación seleccionada en #14/#15 NO se almacena en el ciclo.

### Criterios de aceptación

- [ ] Dado nombre de ciclo válido, ciclo creado con name únicamente (sin legislation_id)
- [ ] Dado nombre duplicado, operación rechazada con error
- [ ] Dado #14 seleccionado, opciones de #15 filtradas al año correspondiente
- [ ] Dado legislación seleccionada en #15, valor NO persiste en el registro de ciclo
- [ ] Dado borrar ciclo con módulos, eliminación bloqueada con mensaje
- [ ] Dado filtros #17–#19, tabla #20 filtra en tiempo real (≤ 300 ms)

---

## UC-04: Gestión de Módulos

**Actor principal**: Admin  
**Precondiciones**: Autenticado como admin; ciclos y legislaciones existentes  
**Elementos del boceto**: #22 (tab Módulos), #23 (nombre), #24 (horas semanales), #25 (legislación), #26 (año), #27 (ciclo), #28 (Guardar), #29 (filtro año), #30 (filtro legislación), #31 (filtro ciclo), #32 (filtro nombre), #33 (tabla módulos)  
**Fase RAG**: use-case

### Flujo principal

1. El admin pulsa el tab Módulos (#22); ruta `/admin/modulos`.
2. La tabla #33 carga todos los módulos.
3. El admin rellena #23 (nombre), #24 (horas semanales), y la cascada de selección: #25 (legislación) → #26 (año, dependiente de #25) → #27 (ciclo, dependiente de #25 y #26).
4. Pulsa Guardar (#28).
5. El sistema persiste el módulo con `name`, `weekly_hours`, `legislation_id`, `cycle_id`.
6. Nueva fila aparece en #33 sin recarga.

### Flujos alternativos

- **A1 — Cascada de selectores**: Seleccionar #25 actualiza opciones de #26; seleccionar #26 filtra opciones de #27. #27 permanece deshabilitado hasta que #25 y #26 tienen valor.
- **A2 — Nombre duplicado en mismo ciclo**: Rechazado (UNIQUE `name, cycle_id, legislation_id`).
- **A3 — Edición inline en #33**: Edición de campos in situ; al guardar se revalida la unicidad.
- **A4 — Borrar con proyectos dependientes**: Bloqueado con mensaje de error.
- **A5 — Filtros**: Los cuatro filtros #29–#32 actúan sobre #33 en tiempo real.

### Postcondiciones

- Módulo persiste con `name`, `weekly_hours`, `legislation_id`, `cycle_id`.
- Tabla #33 actualizada sin recarga.

### Criterios de aceptación

- [ ] Dado todos los campos válidos, módulo creado y row aparece en #33
- [ ] Dado #25 no seleccionado, #27 permanece deshabilitado
- [ ] Dado combinación nombre+ciclo+legislación ya existente, creación rechazada
- [ ] Dado edición confirmada en #33, cambios persisten sin recarga
- [ ] Dado borrar módulo con proyectos, eliminación bloqueada con error
- [ ] Dado horas semanales fuera del rango 1–30, error mostrado
- [ ] Dado filtros #29–#32, tabla filtra en tiempo real (≤ 300 ms)

---

## UC-05: Gestión de Profesorado

**Actor principal**: Admin  
**Precondiciones**: Autenticado como admin; módulos existentes  
**Elementos del boceto**: #34 (tab Profesorado), #35 (usuario), #36 (contraseña), #37 (año), #38 (legislación), #39 (ciclo), #40 (módulo), #41 (Guardar), #42 (filtro año), #43 (filtro legislación), #44 (filtro ciclo), #45 (filtro módulo), #46 (tabla profesores)  
**Fase RAG**: use-case

### Flujo principal

1. El admin pulsa el tab Profesorado (#34); ruta `/admin/profesorado`.
2. La tabla #46 carga todos los profesores con sus módulos asignados.
3. El admin introduce usuario (#35) y contraseña (#36).
4. Selecciona la cascada de asignación: #37 (año) → #38 (legislación) → #39 (ciclo) → #40 (módulo).
5. Pulsa Guardar (#41).
6. El sistema crea el profesor con `must_change_password = true` y lo vincula al módulo vía `teacher_module`.
7. Nueva fila aparece en #46.

### Flujos alternativos

- **A1 — Nombre de usuario duplicado**: Rechazado con error.
- **A2 — Desbloqueo de cuenta**: El admin pulsa 'Desbloquear' para un profesor bloqueado en #46; el sistema restablece `account_locked = false` y `failed_login_attempts = 0`.
- **A3 — Password visible en #46**: Si `must_change_password = true`, la columna contraseña muestra '12345678'. Si `false`, muestra '********'.
- **A4 — Borrar profesor con correcciones**: Bloqueado con mensaje de error.
- **A5 — Cascada de asignación**: Seleccionar #37 filtra #38; seleccionar #38 filtra #39; seleccionar #39 carga módulos en #40.

### Postcondiciones

- Profesor persiste con `username`, `password_hash` (bcrypt), `role = 'profesor'`, `must_change_password = true`.
- Relación `teacher_module` creada para el módulo seleccionado.

### Criterios de aceptación

- [ ] Dado datos válidos, profesor creado con must_change_password = true y row en #46
- [ ] Dado username duplicado, creación rechazada con error
- [ ] Dado must_change_password = true, #46 muestra '12345678' en columna contraseña
- [ ] Dado must_change_password = false, #46 muestra '********'
- [ ] Dado admin desbloquea profesor, account_locked y failed_login_attempts restablecidos a 0
- [ ] Dado borrar profesor con correcciones, eliminación bloqueada
- [ ] Dado contraseña < 8 caracteres, error mostrado
- [ ] Dado filtros #42–#45, tabla #46 filtra en tiempo real (≤ 300 ms)

---

## UC-06: Gestión de Alumnos

**Actor principal**: Profesor  
**Precondiciones**: Autenticado como profesor o tutor; en pestaña Alumnos  
**Elementos del boceto**: #48 (nombre alumno), #49 (año), #50 (legislación), #51 (ciclo), #52 (módulo), #53 (Nuevo), #54 (Subir lista), #55 (filtro nombre), #56 (filtro año), #57 (filtro legislación), #58 (filtro ciclo), #59 (filtro módulo), #60 (tabla alumnos)  
**Fase RAG**: use-case

### Flujo principal

1. El profesor accede a la pestaña Alumnos de Gestionar.
2. La tabla #60 carga todos los alumnos.
3. Introduce el nombre/código del alumno (#48) — texto libre.
4. Selecciona la cascada: #49 (año) → #50 (legislación) → #51 (ciclo) → #52 (módulo).
5. Pulsa Nuevo (#53).
6. El sistema persiste el alumno en `student` y la vinculación en `student_module`.
7. Nueva fila aparece en #60 sin recarga.

### Flujos alternativos

- **A1 — Importación masiva (#54)**: El profesor sube un fichero CSV, JSON o YAML con campos: `nombre`, `año de inicio`, `legislación`, `ciclo`, `módulo`. En caso de error de formato o campo requerido faltante, se muestra un toast de error sin guardar ningún dato (sin saves parciales). En caso de éxito, todos los alumnos se persisten y #60 se actualiza.
- **A2 — Edición inline en #60**: El profesor edita un alumno in situ; los cambios se persisten al confirmar.
- **A3 — Borrar alumno asignado a proyecto**: Bloqueado con mensaje de error; el alumno debe desasignarse del proyecto primero.
- **A4 — Filtros reactivos**: Los filtros #55–#59 filtran #60 en tiempo real con debounce de 300 ms.

### Postcondiciones

- Alumno persiste en `student` con `name` (texto libre), `cycle_id`.
- Relación `student_module` creada.

### Criterios de aceptación

- [ ] Dado nombre libre (ej. 'JJ499' o nombre real), alumno creado sin restricción de formato
- [ ] Dado campo nombre vacío al enviar, error mostrado
- [ ] Dado todos los campos de la cascada válidos, alumno creado y row en #60
- [ ] Dado fichero CSV/JSON/YAML válido en #54, todos los alumnos creados y #60 actualizada
- [ ] Dado fichero con formato incorrecto en #54, toast de error y ningún dato guardado
- [ ] Dado borrar alumno asignado a proyecto, eliminación bloqueada con error
- [ ] Dado filtros #55–#59, tabla filtra en tiempo real (≤ 300 ms)
- [ ] Dado tabla vacía, se muestra estado vacío

---

## UC-07: Gestión de Proyectos

**Actor principal**: Profesor  
**Precondiciones**: Autenticado como profesor o tutor; módulos existentes  
**Elementos del boceto**: #61 (nombre proyecto), #62 (año), #63 (legislación), #64 (ciclo), #65 (módulo), #66 (Nuevo), #67 (filtro nombre), #68 (filtro año), #69 (filtro legislación), #70 (filtro ciclo), #71 (filtro módulo), #72 (tabla proyectos)  
**Fase RAG**: use-case

### Flujo principal

1. El profesor accede a la pestaña Proyectos de Gestionar.
2. La tabla #72 carga todos los proyectos.
3. Introduce el nombre del proyecto (#61).
4. Selecciona la cascada: #62 (año) → #63 (legislación) → #64 (ciclo) → #65 (módulo).
5. Pulsa Nuevo (#66).
6. El sistema persiste el proyecto en `project` con `name`, `academic_year`, y su vinculación al módulo.
7. Nueva fila aparece en #72 sin recarga.

### Flujos alternativos

- **A1 — Cascada de selectores**: Seleccionar #62 actualiza #63; #63 actualiza #64; #64 carga módulos en #65.
- **A2 — Edición inline en #72**: Edición in situ con persistencia al confirmar.
- **A3 — Borrar proyecto con alumnos asignados**: Bloqueado con mensaje de error; el profesor debe desasignar los alumnos primero.
- **A4 — Filtros reactivos**: Los filtros #67–#71 filtran #72 en tiempo real.

### Postcondiciones

- Proyecto persiste con `name`, `academic_year`, y vinculado a un módulo a través de la lógica de negocio.

### Criterios de aceptación

- [ ] Dado nombre y cascada válidos, proyecto creado y row en #72
- [ ] Dado nombre vacío al enviar, error mostrado
- [ ] Dado edición confirmada, cambios persisten sin recarga
- [ ] Dado borrar proyecto con alumnos asignados, eliminación bloqueada
- [ ] Dado filtros #67–#71, tabla filtra en tiempo real (≤ 300 ms)
- [ ] Dado tabla vacía, se muestra estado vacío

---

## UC-07b: Asignación Proyecto-Alumno

**Actor principal**: Profesor  
**Precondiciones**: Autenticado como profesor; proyectos y alumnos existentes  
**Elementos del boceto**: #73 (filtro proyecto), #74 (filtro año proyecto), #75 (filtro legislación proyecto), #76 (filtro ciclo proyecto), #77 (filtro módulo proyecto), #78 (filtro alumno), #79 (filtro año alumno), #80 (filtro legislación alumno), #81 (filtro ciclo alumno), #82 (filtro módulo alumno), #83 (panel proyecto seleccionado), #84 (panel candidatos), #85 (tabla asignaciones), #121 (botón Agregar alumnos)  
**Fase RAG**: use-case

### Flujo principal

1. El profesor accede a la pestaña Asignación.
2. La tabla #85 carga las asignaciones actuales proyecto-alumno.
3. El profesor hace clic en una fila de #85 para seleccionar un proyecto; el panel #83 muestra el nombre del proyecto y #84 carga los candidatos disponibles filtrados.
4. Aplica filtros opcionales sobre proyectos (#73–#77) y sobre alumnos (#78–#82).
5. Selecciona uno o más alumnos en el panel #84.
6. Pulsa Agregar alumnos (#121).
7. El sistema persiste las entradas en `project_student` y actualiza #85 sin recarga.

### Flujos alternativos

- **A1 — Botón #121 deshabilitado**: #121 está deshabilitado si no hay proyecto seleccionado en #83 o si no hay alumno seleccionado en #84.
- **A2 — Máximo 3 alumnos**: Si la asignación superaría 3 alumnos en el proyecto, se muestra un error y no se guarda.
- **A3 — Alumno ya en otro proyecto (mismo año)**: Rechazado con error (restricción de BD via trigger `trg_project_student_year`).
- **A4 — Desasignación**: El profesor elimina una asignación desde #85; requiere confirmación.

### Postcondiciones

- Entradas en `project_student` creadas; tabla #85 actualizada sin recarga.

### Criterios de aceptación

- [ ] Dado sin proyecto seleccionado en #83, botón #121 está deshabilitado
- [ ] Dado sin alumno seleccionado en #84, botón #121 está deshabilitado
- [ ] Dado proyecto y alumno seleccionados, #121 habilitado y asignación guardada
- [ ] Dado asignación excede 3 alumnos en proyecto, error mostrado y asignación bloqueada
- [ ] Dado alumno ya en otro proyecto ese año, error mostrado
- [ ] Dado clic en fila de #85, #83 y #84 se actualizan reactivamente
- [ ] Dado filtros #73–#82, paneles y tabla filtran correctamente
- [ ] Dado desasignar desde #85, fila eliminada tras confirmación

---

## UC-08: Gestión de Rúbrica

**Actor principal**: Profesor  
**Precondiciones**: Autenticado como profesor; al menos un módulo asignado al profesor  
**Elementos del boceto**: #86 (filtro módulo), #87 (año), #88 (legislación), #89 (ciclo), #90 (módulo), #91 (Nuevo nivel), #92 (builder de ítem), #93 (descripción ítem), #94 (Excelente), #95 (Bien), #96 (Mal), #97 (eliminar ítem), #98 (Añadir ítem), #99 (Subir rúbrica), #100 (tabla rúbrica completa)  
**Fase RAG**: use-case

### Flujo principal

1. El profesor accede a la pestaña Rúbrica.
2. Selecciona el módulo mediante la cascada de navegación: #87 (año) → #88 (legislación) → #89 (ciclo) → #90 (módulo), o teclea en el filtro #86.
3. La tabla #100 carga los ítems de la rúbrica del módulo seleccionado.
4. El profesor rellena el builder #92: introduce la descripción del ítem en #93, y asigna valores a los niveles (#94 Excelente, #95 Bien, #96 Mal = siempre 0).
5. Opcionalmente añade niveles intermedios con el botón #91 (máximo 5 niveles por ítem).
6. Pulsa Añadir ítem (#98).
7. El sistema valida que la suma de Excelente de todos los ítems no supere 10; en caso positivo, persiste el ítem y recarga #100.

### Flujos alternativos

- **A1 — Suma Excelente > 10**: El sistema bloquea la operación y muestra un error; no guarda.
- **A2 — Mal siempre 0**: El valor de la celda #96 (Mal) es siempre 0 y no es editable. Si el usuario intenta modificarlo, el valor se rechaza o restablece a 0.
- **A3 — Máximo 5 niveles**: El botón #91 se deshabilita cuando el ítem ya tiene 5 niveles.
- **A4 — Edición inline en #100**: Al editar un ítem existente, se revalida la suma de Excelente. Si hay correcciones asociadas, la rúbrica está congelada: la edición, eliminación y adición de ítems están bloqueadas.
- **A5 — Eliminar ítem en builder #92**: Eliminación inmediata sin confirmación (ítem no persistido aún). Eliminar ítem persistido en #100 requiere confirmación.
- **A6 — Subida de rúbrica (#99)**: El profesor sube un fichero CSV, JSON o YAML. Si ya existe rúbrica, se muestra un diálogo de confirmación antes de reemplazarla completamente. El nivel Mal se fuerza a 0 independientemente del valor en el fichero.
- **A7 — Rúbrica congelada**: Si existen correcciones para el módulo, las acciones de añadir, editar y borrar ítems están bloqueadas (la rúbrica no es modificable).

### Postcondiciones

- Ítem persistido en `rubric_item` con sus `rubric_level` asociados.
- Valor del nivel Mal siempre = 0 en la BD.
- Tabla #100 actualizada sin recarga.

### Criterios de aceptación

- [ ] Dado módulo seleccionado en #90, rúbrica existente cargada en #100
- [ ] Dado builder completo y suma Excelente ≤ 10, ítem guardado y #100 recargado
- [ ] Dado nueva suma Excelente > 10, guardado bloqueado con error
- [ ] Dado celda Mal (#96), valor siempre 0 y no editable
- [ ] Dado botón #91 con 5 niveles ya existentes, botón deshabilitado
- [ ] Dado fichero válido en #99, rúbrica importada con Mal = 0 siempre
- [ ] Dado módulo con correcciones, acciones de edición/borrado bloqueadas (rúbrica congelada)
- [ ] Dado eliminar ítem en builder (no persistido), eliminado sin confirmación
- [ ] Dado eliminar ítem persistido en #100, diálogo de confirmación requerido

---

## UC-09: Corrección de Proyecto

**Actor principal**: Profesor  
**Precondiciones**: Autenticado como profesor; módulo seleccionado tiene rúbrica; proyecto seleccionado tiene alumnos asignados  
**Elementos del boceto**: #101 (año), #102 (legislación), #103 (ciclo), #104 (módulo), #105 (proyecto), #106 (Corregir por grupo), #107 (alumno 1), #108 (alumno 2), #109 (alumno 3), #110 (tabla corrección 5 niveles), #111 (tabla corrección 3 niveles), #112 (nota bruta), #113 (nota normalizada)  
**Fase RAG**: use-case

### Flujo principal

1. El profesor accede a la pantalla Corregir proyecto.
2. Selecciona la cascada de 4 selectores: #101 (año) → #102 (legislación) → #103 (ciclo) → #104 (módulo) → #105 (proyecto).
3. El sistema carga la rúbrica en las tablas #110 y #111, y los checkboxes de alumnos #107–#109.
4. Si desea modo grupo, marca #106; los checkboxes individuales #107–#109 se deshabilitan.
5. El profesor selecciona exactamente un nivel por cada ítem en #110 y #111.
6. Los displays #112 (nota bruta) y #113 (nota normalizada) se actualizan en tiempo real.
7. En cuanto todos los ítems tienen nivel seleccionado, el sistema auto-guarda la corrección sin acción explícita del profesor.
8. Tras el auto-guardado, la pantalla permanece activa para que el profesor pueda seleccionar otro proyecto.

### Flujos alternativos

- **A1 — Corrección existente pre-cargada**: Si ya existe una corrección para el alumno + proyecto, las celdas se pre-seleccionan con los valores previos (modo edición).
- **A2 — Módulo sin rúbrica**: Al seleccionar #104, el sistema muestra un aviso y no carga #110/#111.
- **A3 — Modo individual**: Con #106 desmarcado, el profesor puede seleccionar solo algunos alumnos mediante #107–#109; el auto-guardado aplica solo a los alumnos seleccionados.
- **A4 — Cascada en cascada**: Cambiar un selector upstream (#101–#104) restablece los selectores downstream.

### Postcondiciones

- Entradas en `correction` y `correction_item` creadas o actualizadas en la BD.
- `final_score` calculado: `(suma_seleccionada / suma_excelente) × 10`, redondeado a 2 decimales.
- La pantalla permanece activa tras el guardado para continuar con otro proyecto.

### Criterios de aceptación

- [ ] Dado proyecto seleccionado, rúbrica cargada en #110/#111 y checkboxes en #107–#109
- [ ] Dado celda de nivel pulsada, celda seleccionada y resto de la fila deseleccionadas
- [ ] Dado selección, #112 y #113 actualizados inmediatamente
- [ ] Dado todos los ítems con nivel seleccionado, corrección auto-guardada sin botón
- [ ] Dado modo grupo (#106 marcado), grade aplicado a todos los alumnos del proyecto
- [ ] Dado #106 marcado, checkboxes #107–#109 deshabilitados
- [ ] Dado corrección existente, celdas pre-seleccionadas con valores previos
- [ ] Dado módulo sin rúbrica, advertencia mostrada y tablas #110/#111 no cargadas
- [ ] Dado auto-guardado completo, pantalla permanece activa con #105 disponible para nueva selección
- [ ] `final_score` = (puntos_obtenidos / puntos_máximos) × 10, redondeado a 2 decimales

---

## UC-10: Visualización e impresión de Notas

**Actor principal**: Profesor (vista módulo propio) / Tutor (vista panorámica ciclo)  
**Precondiciones**: Autenticado como profesor o tutor; correcciones existentes  
**Elementos del boceto**: #47 (botón Imprimir notas en landing — solo tutor), #114 (año), #115 (legislación), #116 (ciclo), #117 (módulo), #118 (proyecto), #119 (tabla notas), #120 (Imprimir PDF), #122 (badges de estado)  
**Fase RAG**: use-case

### Flujo principal

1. El profesor o tutor accede a la pantalla de notas.
   - Tutor: también puede acceder desde el botón #47 en la landing page.
2. Los badges de estado #122 aparecen en cuanto se selecciona un ciclo en #116; uno por módulo del ciclo, verde si todos los alumnos tienen corrección, rojo si falta alguna.
3. Rellena la cascada: #114 (año) → #115 (legislación) → #116 (ciclo) → #117 (módulo) → #118 (proyecto).
   - Para el rol profesor: #117 muestra solo su módulo asignado.
   - Para el rol tutor: #117 muestra todos los módulos del ciclo.
4. La tabla #119 carga las notas del proyecto seleccionado.
   - Profesor: columnas = nombre alumno, nota del módulo.
   - Tutor: columnas = nombre alumno, nota por módulo (todos), nota final ponderada.
5. El profesor o tutor pulsa Imprimir (#120), habilitado solo cuando los 5 selectores tienen valor.
6. El sistema genera el PDF con el contenido de #119 y el navegador lo descarga.

### Flujos alternativos

- **A1 — Botón #47 solo para tutor**: En la landing page, el botón 'Imprimir notas' solo se renderiza para `role = 'tutor'`; no aparece para `role = 'profesor'`.
- **A2 — PDF deshabilitado**: #120 permanece deshabilitado hasta que todos los 5 selectores tienen valor.
- **A3 — Sin correcciones**: La tabla #119 muestra estado vacío.
- **A4 — Cambio de selector upstream**: Al cambiar un selector, los downstream se reinician y #119 y #120 se limpian/deshabilitan.

### Postcondiciones

- PDF generado con el contenido de #119 descargado en el navegador.
- No se modifica ningún dato en la BD.

### Criterios de aceptación

- [ ] Dado role = 'tutor', botón #47 renderizado en landing; dado role = 'profesor', no renderizado
- [ ] Dado ciclo seleccionado en #116, badges #122 renderizan uno por módulo
- [ ] Dado badge verde: todos los alumnos del módulo tienen corrección registrada
- [ ] Dado badge rojo: al menos un alumno del módulo carece de corrección
- [ ] Dado role = 'profesor', #117 muestra solo su módulo
- [ ] Dado role = 'tutor', #117 muestra todos los módulos del ciclo seleccionado
- [ ] Dado todos los 5 selectores con valor, #119 cargada y #120 habilitado
- [x] Dado #120 pulsado, PDF generado y descargado; contenido igual a #119
- [ ] Dado role = 'tutor', nota final en #119 = sum(nota_módulo × horas) / sum(horas), redondeado a 2 decimales, máximo 10
- [ ] Dado algún selector sin valor, #120 deshabilitado
- [ ] Dado sin correcciones para el proyecto, #119 muestra estado vacío
- [ ] Filas de #119 ordenadas alfabéticamente por nombre de proyecto, luego por nombre de alumno

---

*Fin de use-cases.md — 10 UCs + UC-07b · 122 elementos cubiertos*
