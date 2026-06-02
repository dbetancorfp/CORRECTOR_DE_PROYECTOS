# Casos de Uso — Corrector de Proyectos

**Feature**: corrector-v1  
**Generado por**: Agente 3 — Arquitecto de Requisitos  
**Fase RAG**: use-case  
**Elementos del boceto cubiertos**: 90 / 90  
**Fecha**: 2026-06-02

---

## Índice de casos de uso

| ID | Flujo | Elementos |
|----|-------|-----------|
| UC-01 | Login y autenticación | #1–#5 |
| UC-02 | Gestión de Legislaciones | #6–#10, #81–#84 |
| UC-03 | Gestión de Ciclos | #11–#15 |
| UC-04 | Gestión de Módulos | #16–#22 |
| UC-05 | Gestión de Profesorado | #23–#29 |
| UC-06 | Gestión de Alumnos | #31–#41 |
| UC-07 | Gestión de Proyectos | #42–#51 |
| UC-08 | Gestión de Rúbrica | #52–#64, #90 |
| UC-09 | Corrección de Proyecto | #65–#80 |
| UC-10 | Visualización e impresión de Notas | #30, #85–#89 |

---

## UC-01: Login y autenticación

**Actor principal**: Profesor / Admin  
**Precondiciones**: El usuario no está autenticado. El sistema tiene al menos una cuenta de usuario en la BD.  
**Elementos del boceto**: #1 (campo usuario), #2 (campo contraseña), #3 (botón Acceder), #4 (logo), #5 (navbar con Salir)  
**Fase RAG**: use-case

### Flujo principal

1. El usuario accede a la pantalla de login (`/`).
2. El usuario introduce su nombre de usuario en el campo #1 (formato Consejería, e.g. `dbetqui`; el admin usa el literal `Admin`).
3. El usuario introduce su contraseña en el campo #2 (siempre enmascarada).
4. El usuario pulsa el botón Acceder (#3).
5. El sistema valida las credenciales contra la BD.
6. Si las credenciales son correctas y la contraseña **no** es la predeterminada `12345678`, el sistema crea una sesión y redirige al usuario a `/admin` (rol admin) o `/profesor` (rol profesor/tutor).
7. La barra de navegación (#5) muestra el nombre de usuario autenticado. El botón Salir destruye la sesión sin confirmación y redirige a `/`.

### Flujos alternativos

- **A1 — Credenciales inválidas**: El sistema muestra el mensaje `Credenciales incorrectas` en la misma pantalla. El contador de intentos fallidos aumenta en 1.
- **A2 — Tercer intento fallido**: Tras 3 intentos consecutivos fallidos, el sistema bloquea la cuenta (`locked = true`), muestra `Póngase en contacto con el Administrador` y el usuario no puede volver a intentarlo. Excepción: si la cuenta es del admin, el mensaje es `Póngase en contacto con el administrador de la base de datos` y la recuperación requiere intervención directa en la BD.
- **A3 — Primer acceso (contraseña predeterminada)**: Si la contraseña introducida es `12345678`, el sistema muestra en la misma pantalla dos campos adicionales: nueva contraseña y confirmación. El usuario introduce la nueva contraseña (mínimo 8 caracteres, no puede ser `12345678`). Si nueva contraseña y confirmación coinciden, el sistema actualiza la BD y redirige al rol correspondiente. Si no coinciden, se muestra un error y el flujo se repite.
- **A4 — Cuenta bloqueada**: Un usuario con cuenta bloqueada no puede hacer login. Solo el admin puede desbloquearlo (ver UC-05, A3).

### Postcondiciones

- El usuario tiene una sesión activa y está en su pantalla de inicio según el rol.
- `failed_login_attempts` se resetea a 0 tras un login exitoso.

### Criterios de aceptación

- [ ] Cuando las credenciales son válidas, el usuario es redirigido a `/admin` (admin) o `/profesor` (profesor/tutor)
- [ ] El campo #1 acepta formato Consejería (e.g. `dbetqui`) y el literal `Admin`
- [ ] Enviar un usuario vacío muestra un error de campo obligatorio
- [ ] Los caracteres del campo #2 siempre están enmascarados
- [ ] Cuando la contraseña enviada es `12345678`, aparecen dos campos adicionales para nueva contraseña y confirmación en la misma pantalla
- [ ] Cuando nueva contraseña y confirmación coinciden, la BD se actualiza y el usuario es redirigido a su rol
- [ ] Cuando nueva contraseña y confirmación no coinciden, se muestra un error y el flujo se repite
- [ ] Establecer la nueva contraseña como `12345678` es rechazado con un error de validación
- [ ] Cuando las credenciales son inválidas, se muestra `Credenciales incorrectas` en la misma pantalla
- [ ] Tras 3 intentos fallidos consecutivos se muestra `Póngase en contacto con el Administrador` y la cuenta queda bloqueada
- [ ] Una cuenta bloqueada no puede hacer login hasta ser desbloqueada por el admin
- [ ] Al pulsar Salir (#5), la sesión se destruye y el usuario es redirigido a `/` sin diálogo de confirmación
- [ ] La barra de navegación muestra el nombre de usuario autenticado

---

## UC-02: Gestión de Legislaciones

**Actor principal**: Admin  
**Precondiciones**: El admin está autenticado. Está en la pantalla `/admin/legislacion`.  
**Elementos del boceto**: #6 (tabs admin), #7 (campo siglas), #8 (campo año inicio), #9 (campo año fin), #10 (botón Guardar), #81 (botón Nuevo), #82 (tabla legislaciones), #83 (editar fila), #84 (borrar fila)  
**Fase RAG**: use-case

### Flujo principal — Crear legislación

1. El admin accede a la pantalla de Legislación desde el panel de tabs (#6).
2. El admin pulsa Nuevo (#81); el formulario inline (#7, #8, #9) se limpia y queda listo para nueva entrada.
3. El admin introduce la abreviatura (#7: 2–10 letras mayúsculas, única en el sistema), el año de inicio (#8: entero de 4 dígitos), y el año de fin (#9: debe ser exactamente inicio + 1).
4. El admin pulsa Guardar (#10).
5. El sistema valida los campos, realiza un INSERT y refresca la tabla #82 desde la BD.
6. El formulario retiene los valores introducidos (no se limpia tras guardar).

### Flujo principal — Editar legislación

1. El admin pulsa el icono de editar (#83) en una fila de la tabla #82.
2. El formulario inline (#7, #8, #9) se rellena con los valores actuales de esa fila.
3. El admin modifica los campos y pulsa Guardar (#10).
4. El sistema valida, realiza un UPDATE y refresca la tabla #82.

### Flujo principal — Borrar legislación

1. El admin pulsa el icono de borrar (#84) en una fila.
2. Aparece un diálogo de confirmación.
3. Si la legislación no tiene ciclos asociados, se elimina y la tabla #82 se refresca.

### Flujos alternativos

- **A1 — Siglas duplicadas**: El guardado es bloqueado con un error de restricción única.
- **A2 — Año fin ≠ inicio + 1**: El guardado es bloqueado con un error de validación.
- **A3 — Borrado bloqueado por dependencias**: Si la legislación tiene ciclos asociados, se muestra un aviso bloqueante y no se elimina.
- **A4 — Tab inactivo**: Hacer click en Ciclos (#11), Módulos (#16) o Profesorado (#23) navega al tab correspondiente y marca ese tab como activo.

### Postcondiciones

- La tabla #82 refleja el estado actual de la BD.
- La legislación creada/editada/borrada está persisitda en la BD.

### Criterios de aceptación

- [ ] Enviar una abreviatura duplicada muestra un error de restricción única y bloquea el guardado
- [ ] Una abreviatura con minúsculas es rechazada
- [ ] Una abreviatura de más de 10 caracteres es rechazada
- [ ] Una abreviatura de menos de 2 caracteres es rechazada
- [ ] Cuando año_fin ≠ año_inicio + 1, el guardado es bloqueado
- [ ] Cuando todos los campos son válidos y se crea un nuevo registro, el registro es insertado y la tabla #82 se refresca
- [ ] Cuando todos los campos son válidos y se edita un registro existente, el registro es actualizado y la tabla #82 se refresca
- [ ] Tras guardar, los campos del formulario retienen sus valores
- [ ] El icono de editar (#83) rellena el formulario inline con los valores de la fila seleccionada; no se abre modal
- [ ] Un diálogo de confirmación aparece antes del borrado
- [ ] Una legislación con ciclos asociados no puede ser eliminada; se muestra un aviso bloqueante
- [ ] Hacer click en cada tab navega a la ruta correspondiente y marca ese tab como activo

---

## UC-03: Gestión de Ciclos

**Actor principal**: Admin  
**Precondiciones**: El admin está autenticado. Está en la pantalla `/admin/ciclos`.  
**Elementos del boceto**: #11 (tab Ciclos), #12 (botón Nuevo + modal), #13 (tabla ciclos), #14 (editar inline), #15 (borrar fila)  
**Fase RAG**: use-case

### Flujo principal — Crear ciclo

1. El admin accede al tab Ciclos (#11).
2. El admin pulsa Nuevo (#12); se abre un modal con exactamente dos campos: nombre y legislación (select).
3. El admin introduce el nombre del ciclo y selecciona una legislación.
4. El admin guarda. El sistema valida, realiza un INSERT y refresca la tabla #13.

### Flujo principal — Editar ciclo

1. El admin pulsa el icono de editar (#14) en una fila de la tabla #13.
2. La fila entra en modo edición inline: los campos nombre y legislación son editables directamente en la fila.
3. El admin guarda. El sistema valida, realiza un UPDATE y actualiza la fila.

### Flujo principal — Borrar ciclo

1. El admin pulsa el icono de borrar (#15). Aparece un diálogo de confirmación.
2. Si el ciclo no tiene módulos asociados, se elimina y la tabla #13 se refresca.

### Flujos alternativos

- **A1 — Nombre duplicado bajo la misma legislación**: Se muestra un error de restricción única y el guardado es bloqueado.
- **A2 — Legislación no seleccionada**: Se muestra un error de campo obligatorio.
- **A3 — Borrado bloqueado por dependencias**: Si el ciclo tiene módulos asociados, se muestra un aviso bloqueante.

### Postcondiciones

- La tabla #13 refleja el estado actual de la BD.

### Criterios de aceptación

- [ ] Pulsar Nuevo abre un modal con exactamente los campos: nombre y legislación (select)
- [ ] Tras guardar un ciclo válido, la tabla #13 se refresca con la nueva entrada
- [ ] Guardar sin seleccionar legislación muestra un error de campo obligatorio
- [ ] Guardar un nombre que ya existe bajo la misma legislación muestra un error de restricción única
- [ ] Pulsar el icono de editar activa la edición inline de nombre y legislación en la fila; no se abre modal
- [ ] Guardar un nombre ya existente bajo la misma legislación en edición inline muestra un error y no guarda
- [ ] Un diálogo de confirmación aparece antes del borrado
- [ ] Borrar un ciclo con módulos asociados muestra un aviso bloqueante y no elimina
- [ ] Cuando no existen ciclos, se muestra un mensaje de estado vacío en la tabla #13

---

## UC-04: Gestión de Módulos

**Actor principal**: Admin  
**Precondiciones**: El admin está autenticado. Está en la pantalla `/admin/modulos`. Existen al menos una legislación y un ciclo en el sistema.  
**Elementos del boceto**: #16 (tab Módulos), #17 (botón Nuevo + modal), #18 (tabla módulos), #19 (columna legislación), #20 (columna ciclo), #21 (editar inline), #22 (borrar fila)  
**Fase RAG**: use-case

### Flujo principal — Crear módulo

1. El admin accede al tab Módulos (#16).
2. El admin pulsa Nuevo (#17); se abre un modal con exactamente cinco campos: nombre, siglas, legislación (select UI-filter), horas_semanales (número), ciclo (select).
3. Al abrir el modal, el select de ciclo muestra todos los ciclos disponibles. Al seleccionar una legislación (select UI-filter), el select de ciclo se filtra para mostrar solo los ciclos de esa legislación.
4. El admin selecciona ciclo y completa los demás campos. Guarda.
5. El sistema valida, realiza un INSERT. La tabla #18 se refresca. La columna #19 muestra la legislación derivada del ciclo seleccionado.

### Flujo principal — Editar módulo

1. El admin pulsa el icono de editar (#21) en una fila de la tabla #18.
2. La fila entra en modo edición inline: campos editables son nombre, siglas, horas_semanales, ciclo (select).
3. La legislación (#19) se actualiza automáticamente al cambiar el ciclo.
4. El admin guarda. El sistema valida y realiza un UPDATE.

### Flujo principal — Borrar módulo

1. El admin pulsa el icono de borrar (#22). Aparece un diálogo de confirmación.
2. Si el módulo no tiene proyectos asociados, se elimina y la tabla #18 se refresca.

### Flujos alternativos

- **A1 — Siglas duplicadas bajo la misma legislación**: Se muestra un error de restricción única.
- **A2 — Borrado bloqueado**: Si el módulo tiene proyectos asociados, se muestra un aviso bloqueante.

### Postcondiciones

- La tabla #18 refleja el estado actual con todas las columnas (nombre, siglas, legislación, horas_semanales, ciclo).

### Criterios de aceptación

- [ ] Pulsar Nuevo abre un modal con exactamente los campos: nombre, siglas, legislación (select), horas_semanales (número), ciclo (select)
- [ ] Al abrir el modal, el select de ciclo muestra todos los ciclos
- [ ] Seleccionar una legislación en el modal filtra el select de ciclo para mostrar solo los ciclos de esa legislación
- [ ] Guardar un módulo con siglas ya existentes bajo la misma legislación muestra un error de restricción única
- [ ] Tras guardar un módulo válido, la tabla #18 se refresca con la nueva entrada
- [ ] El módulo eliminado con proyectos asociados muestra un aviso bloqueante
- [ ] La edición inline no abre modal; los cuatro campos (nombre, siglas, horas_semanales, ciclo) son editables en la fila
- [ ] Al cambiar el ciclo en edición inline, la columna legislación (#19) se actualiza para reflejar el ciclo nuevo
- [ ] Cada fila del módulo muestra su legislación derivada del ciclo en la columna #19
- [ ] Cada fila del módulo muestra el nombre del ciclo en la columna #20

---

## UC-05: Gestión de Profesorado

**Actor principal**: Admin  
**Precondiciones**: El admin está autenticado. Está en la pantalla `/admin/profesorado`.  
**Elementos del boceto**: #23 (tab Profesorado), #24 (botón Nuevo + modal), #25 (tabla profesores), #26 (columna ciclos), #27 (columna módulos), #28 (editar inline + desbloqueo), #29 (borrar fila)  
**Fase RAG**: use-case

### Flujo principal — Crear profesor

1. El admin accede al tab Profesorado (#23).
2. El admin pulsa Nuevo (#24); se abre un modal con exactamente cuatro campos: nombre de usuario (Consejería), nombre completo, ciclo(s) (multi-select), módulo(s) (multi-select).
3. El admin completa los campos. Un profesor puede tener módulos de diferentes ciclos.
4. El admin guarda. El sistema valida, realiza un INSERT con contraseña predeterminada `12345678` y refresca la tabla #25.

### Flujo principal — Editar profesor / Desbloquear cuenta

1. El admin pulsa el icono de editar (#28) en una fila.
2. La fila entra en modo edición inline: campos editables son username, nombre_completo, ciclos (multi-select), módulos (multi-select). La contraseña NO es editable en este modo.
3. El admin guarda. El sistema valida y realiza un UPDATE.
4. **Efecto de desbloqueo**: Si el profesor tenía la cuenta bloqueada (`locked = true`), guardar sus datos resetea `failed_login_attempts` a 0 y cambia `locked` a `false`.

### Flujo principal — Borrar profesor

1. El admin pulsa el icono de borrar (#29). Aparece un diálogo de confirmación.
2. Si el profesor no tiene módulos asignados ni correcciones guardadas, se elimina y la tabla #25 se refresca.

### Flujos alternativos

- **A1 — Username duplicado**: Se muestra un error de restricción única y el guardado es bloqueado.
- **A2 — Borrado bloqueado**: Si el profesor tiene módulos asignados o correcciones guardadas, se muestra un aviso bloqueante.

### Postcondiciones

- La tabla #25 refleja el estado actual.
- La columna de contraseña en #25 muestra `12345678` si el profesor no ha cambiado aún su contraseña, o `********` si ya la cambió.

### Criterios de aceptación

- [ ] Pulsar Nuevo abre un modal con exactamente los campos: username, nombre_completo, ciclos (multi-select), módulos (multi-select)
- [ ] Tras guardar, el nuevo profesor aparece en la tabla #25
- [ ] Un username duplicado es rechazado con un error de restricción única
- [ ] Un profesor puede tener módulos de diferentes ciclos
- [ ] Un profesor que no ha cambiado su contraseña muestra `12345678` en la columna de contraseña
- [ ] Un profesor que ha cambiado su contraseña muestra `********` en la columna de contraseña
- [ ] Pulsar el icono de editar activa la edición inline; no se abre modal
- [ ] En modo edición inline, el campo contraseña no se muestra
- [ ] Un username duplicado en edición inline es rechazado con un error de restricción única
- [ ] Guardar el registro de un profesor bloqueado desbloquea la cuenta y resetea el contador de intentos fallidos
- [ ] Cambios guardados persisten y la fila de la tabla se actualiza
- [ ] Un diálogo de confirmación aparece antes del borrado
- [ ] Un profesor con módulos asignados o correcciones no puede ser borrado; se muestra un aviso bloqueante
- [ ] Un profesor con múltiples ciclos muestra los nombres separados por coma en la columna #26
- [ ] Un profesor con múltiples módulos muestra las siglas separadas por coma en la columna #27

---

## UC-06: Gestión de Alumnos

**Actor principal**: Profesor  
**Precondiciones**: El profesor está autenticado. Está en `/profesor/gestionar/alumnos`.  
**Elementos del boceto**: #31 (tab Alumnos), #32 (filtro código), #33 (filtro ciclo), #34 (filtro legislación), #35 (botón Nuevo + modal), #36 (tabla alumnos), #37 (columna ciclo), #38 (columna legislación), #39 (editar inline), #40 (borrar fila), #41 (subir lista CSV/YAML/JSON)  
**Fase RAG**: use-case

### Flujo principal — Crear alumno

1. El profesor accede al tab Alumnos (#31).
2. El profesor pulsa Nuevo (#35); se abre un modal con exactamente cuatro campos: nombre_completo, identificador (código anónimo, e.g. `JJ499`), ciclo (select), legislación (select UI-filter).
3. La legislación actúa como filtro UI para el select de ciclo; no se almacena en el alumno.
4. El profesor completa los campos y guarda.
5. El sistema valida, inserta el identificador y ciclo en la tabla `alumnos`, y el nombre_completo en la tabla segura de privacidad `alumno_nombres`.
6. La tabla #36 se refresca (muestra solo el identificador anónimo, no el nombre_completo).

### Flujo principal — Editar alumno

1. El profesor pulsa el icono de editar (#39) en una fila.
2. La fila entra en modo edición inline: campos editables son nombre_completo, identificador, ciclo (select). La legislación actúa como UI-filter.
3. El profesor guarda. El sistema actualiza `alumnos` (identificador, ciclo) y `alumno_nombres` (nombre_completo).

### Flujo principal — Borrar alumno

1. El profesor pulsa el icono de borrar (#40). Aparece una confirmación.
2. Si el alumno no tiene notas ni asignaciones a proyectos, se elimina.
3. Si tiene dependencias, se muestra un pop-up con las dependencias listadas y el borrado es bloqueado.

### Flujo principal — Subida masiva de alumnos

1. El profesor pulsa Subir lista (#41) y selecciona un fichero YAML, CSV o JSON.
2. El sistema parsea el fichero fila a fila.
3. Las filas válidas se insertan (identificador + ciclo en `alumnos`, nombre_completo en `alumno_nombres`).
4. Las filas inválidas se omiten. Al finalizar, se muestra un informe con las filas omitidas y el motivo de cada rechazo.
5. La tabla #36 se refresca.

### Flujo principal — Filtrado reactivo

1. El profesor escribe en cualquiera de los campos #32 (código), #33 (ciclo), #34 (legislación).
2. La tabla #36 se actualiza después de 300ms sin necesidad de pulsar ningún botón.

### Flujos alternativos

- **A1 — Identificador duplicado**: Se muestra un error de restricción única y el guardado es bloqueado.
- **A2 — nombre_completo vacío**: Se muestra un error de campo obligatorio.
- **A3 — Fichero no parseable**: Se muestra un error de parseo y no se importa ninguna fila.
- **A4 — Formato de fichero no soportado**: Se muestra un error; solo YAML, CSV y JSON son aceptados.
- **A5 — Fila con ciclo desconocido en la BD**: La fila se omite y aparece en el informe de errores.
- **A6 — Fila con ciclo/legislación inconsistentes**: La fila se omite y aparece en el informe de errores.

### Postcondiciones

- Los nombres reales de los alumnos NO son visibles en la tabla #36 (solo el código anónimo).
- La tabla `alumno_nombres` contiene los nombres reales vinculados por identificador.

### Criterios de aceptación

- [ ] Pulsar Nuevo abre un modal con exactamente los campos: nombre_completo, identificador, ciclo (select), legislación (select)
- [ ] Al abrir el modal, el select de ciclo muestra todos los ciclos
- [ ] Seleccionar una legislación filtra el select de ciclo para mostrar solo los ciclos de esa legislación
- [ ] Tras guardar, el nuevo alumno aparece en la tabla #36 solo con el identificador anónimo (no el nombre_completo)
- [ ] nombre_completo se almacena en la tabla segura y no se muestra en #36
- [ ] Un identificador duplicado es rechazado con un error de restricción única
- [ ] Guardar sin nombre_completo muestra un error de campo obligatorio
- [ ] La edición inline no abre modal; los campos nombre_completo, identificador y ciclo son editables en la fila
- [ ] Un identificador duplicado en edición inline es rechazado
- [ ] El borrado de un alumno con notas o asignaciones muestra un pop-up con las dependencias listadas y bloquea el borrado
- [ ] Se aceptan ficheros YAML, CSV y JSON; cualquier otro formato muestra un error
- [ ] Un fichero no parseable muestra un error de parseo y no se importa ninguna fila
- [ ] Las filas válidas se importan aunque otras filas del mismo fichero sean inválidas
- [ ] Las filas con ciclo desconocido, ciclo/legislación inconsistentes, campos faltantes o identificador duplicado son omitidas y listadas en el informe
- [ ] Escribir en #32, #33 o #34 actualiza la tabla #36 tras 300ms sin pulsar ningún botón
- [ ] Limpiar el campo de filtro restaura la tabla completa sin filtrar

---

## UC-07: Gestión de Proyectos

**Actor principal**: Profesor  
**Precondiciones**: El profesor está autenticado. Está en `/profesor/gestionar/proyectos`. Existen alumnos y módulos en el sistema.  
**Elementos del boceto**: #42 (selector módulo activo), #43 (filtro nombre), #44 (filtro año), #45 (filtro legislación), #46 (botón Nuevo + modal), #47 (tabla proyectos), #48 (columna alumnado), #49 (columna DEPRECATED), #50 (editar inline), #51 (borrar fila)  
**Fase RAG**: use-case

### Flujo principal — Seleccionar módulo activo

1. El profesor pulsa el selector de módulo (#42); se muestra la lista de módulos asignados al profesor autenticado.
2. El profesor selecciona un módulo. La tabla #47 se recarga con los proyectos de ese módulo.

### Flujo principal — Crear proyecto

1. El profesor pulsa Nuevo (#46); se abre un modal con exactamente cuatro campos: nombre, año_académico (select), ciclo (select), alumnos (multi-select).
2. El año_académico muestra los valores `start_year` de las Legislaciones existentes, con el año actual como valor predeterminado.
3. El ciclo se prellena con el ciclo del módulo activo (puede cambiarse).
4. El multi-select de alumnos muestra solo los alumnos del ciclo seleccionado que NO están ya asignados a un proyecto en el mismo año_académico.
5. Al cambiar el ciclo, el multi-select de alumnos se recarga.
6. El profesor selecciona entre 1 y 3 alumnos y guarda.
7. El proyecto queda vinculado al módulo activo.

### Flujo principal — Editar proyecto

1. El profesor pulsa el icono de editar (#50). La fila entra en modo edición inline.
2. Todos los campos son editables: nombre, año_académico, ciclo, alumnos.
3. Al cambiar el ciclo, el multi-select de alumnos se recarga con los alumnos del nuevo ciclo.
4. Si se elimina un alumno que tiene correcciones guardadas, aparece un aviso antes de guardar.
5. Si el profesor confirma, el alumno es eliminado del proyecto y sus correcciones para ese proyecto se eliminan en cascada.
6. Si cancela, no se guarda ningún cambio.

### Flujo principal — Borrar proyecto

1. El profesor pulsa el icono de borrar (#51). Aparece un diálogo de confirmación.
2. Si el proyecto no tiene correcciones guardadas, se elimina y la tabla #47 se refresca.

### Flujos alternativos

- **A1 — Sin alumnos (0)**: Guardar con 0 alumnos es bloqueado con un error de validación.
- **A2 — Más de 3 alumnos**: Guardar con más de 3 alumnos es bloqueado con un error de validación.
- **A3 — Borrado bloqueado**: Un proyecto con correcciones guardadas no puede eliminarse; se muestra un aviso.
- **A4 — Columna #49**: La columna "Añadir alumnado" (deprecated) no se renderiza en la tabla.

### Postcondiciones

- La tabla #47 muestra los proyectos del módulo activo con columnas: nombre, año_académico, alumnado (códigos separados por coma), editar, borrar.
- El alumnado mostrado son códigos anónimos, no nombres reales.

### Criterios de aceptación

- [ ] Solo los módulos asignados al profesor autenticado aparecen en el selector #42
- [ ] Tras seleccionar un módulo en #42, la tabla #47 se recarga con los proyectos de ese módulo
- [ ] El modal de Nuevo tiene exactamente los campos: nombre, año_académico (select), ciclo (select), alumnos (multi-select)
- [ ] Los valores del select año_académico provienen de los start_year de las Legislaciones existentes
- [ ] El ciclo se prellena con el ciclo del módulo activo al abrir el modal
- [ ] Cambiar el ciclo recarga el multi-select de alumnos con los alumnos del nuevo ciclo
- [ ] El multi-select de alumnos muestra solo alumnos del ciclo seleccionado no ya asignados a un proyecto en el mismo año_académico
- [ ] Seleccionar 0 o más de 3 alumnos bloquea el guardado con un error de validación
- [ ] Tras guardar, el proyecto aparece en #47 vinculado al módulo activo
- [ ] La edición inline no abre modal; los cuatro campos son editables en la fila
- [ ] Cambiar el ciclo en edición inline recarga el multi-select de alumnos
- [ ] Guardar con 0 alumnos en edición inline es bloqueado con un error de validación
- [ ] Al guardar con un alumno eliminado que tiene correcciones, aparece un aviso listando los afectados e informando que sus correcciones serán eliminadas
- [ ] Si el profesor confirma, los alumnos son eliminados y sus correcciones para ese proyecto son eliminadas
- [ ] Si el profesor cancela, no se guarda ningún cambio
- [ ] Añadir nuevos alumnos guarda sin ningún aviso
- [ ] Un proyecto con correcciones guardadas no puede eliminarse; se muestra un aviso bloqueante
- [ ] La columna "Añadir alumnado" (deprecated, #49) no se renderiza en la tabla de proyectos
- [ ] Solo los proyectos del módulo activo se muestran en #47
- [ ] Cada fila del proyecto muestra su año_académico
- [ ] Escribir en #43, #44 o #45 actualiza la tabla #47 tras 300ms

---

## UC-08: Gestión de Rúbrica

**Actor principal**: Profesor  
**Precondiciones**: El profesor está autenticado. Está en `/profesor/gestionar/rubrica`. Existen módulos asignados al profesor.  
**Elementos del boceto**: #52 (tab Rúbrica), #53 (filtro módulo), #54 (filtro año), #55 (botón Nuevo ítem), #56 (grid rúbrica), #57 (campo nombre ítem), #58 (Excelente), #59 (Muy bien), #60 (Bien), #61 (Regular), #62 (Mal = 0, fijo), #63 (subir rúbrica YAML/CSV/JSON), #64 (puntuación máxima), #90 (borrar ítem)  
**Fase RAG**: use-case

### Flujo principal — Seleccionar módulo y cargar rúbrica

1. El profesor accede al tab Rúbrica (#52).
2. El profesor escribe en el filtro #53; se muestra una lista de módulos asignados al profesor que coinciden (búsqueda case-insensitive por nombre o siglas, con 300ms debounce).
3. El profesor selecciona un módulo de la lista. Los ítems de la rúbrica de ese módulo se cargan en el grid #56.
4. El campo #64 muestra la suma actual de todos los valores Excelente.

### Flujo principal — Añadir ítem a la rúbrica

1. El profesor pulsa Nuevo (#55).
2. Se añade una nueva fila editable vacía en la tabla #56.
3. El profesor rellena los campos: nombre del ítem (#57), valores numéricos de Excelente (#58), Muy bien (#59), Bien (#60), Regular (#61). El campo Mal (#62) siempre muestra 0.00 y no es editable.
4. Cada campo se auto-guarda en la BD al perder el foco (blur).
5. El campo #64 se recalcula tras cada guardado de un valor Excelente.
6. Los valores deben respetar el orden descendente: Excelente > Muy bien > Bien > Regular > 0 (Mal).

### Flujo principal — Editar ítem existente

1. Los campos del grid #56 son siempre visibles y editables sin doble click (a menos que la rúbrica esté congelada).
2. Cada campo se auto-guarda en la BD al perder el foco.
3. La suma en #64 se recalcula tras cada cambio guardado en Excelente.

### Flujo principal — Borrar ítem

1. El profesor pulsa el icono de borrar (#90) en una fila del grid.
2. Aparece un diálogo de confirmación.
3. Si la rúbrica no ha sido usada en ninguna corrección, se elimina el ítem.
4. El campo #64 se recalcula; si la suma ya no es 10.00, la rúbrica queda marcada como inválida (mostrada en rojo).

### Flujo principal — Subir rúbrica desde fichero

1. El profesor pulsa Subir (#63) y selecciona un fichero YAML, CSV o JSON.
2. Si existe una rúbrica previa sin correcciones, se muestra una confirmación de pérdida de datos.
3. Tras confirmar, la rúbrica existente se reemplaza completamente por la importada.
4. El grid #56 y el campo #64 se refrescan.

### Flujos alternativos

- **A1 — Rúbrica congelada**: Si existe alguna corrección para la rúbrica del módulo, los campos #56 son de solo lectura, el botón #55 muestra un aviso bloqueante, el botón #63 muestra un aviso bloqueante y el botón #90 muestra un aviso bloqueante.
- **A2 — Rúbrica inválida (suma ≠ 10.00)**: El campo #64 se muestra en rojo. La pantalla de corrección (UC-09) queda bloqueada para este módulo.
- **A3 — Orden descendente violado**: El guardado del cell individual es bloqueado con un error de validación.
- **A4 — Nombre de ítem vacío**: El guardado del campo nombre es rechazado con error en blur.
- **A5 — Sin módulo seleccionado en subida**: La subida (#63) muestra un error pidiendo seleccionar un módulo primero.

### Postcondiciones

- Un módulo tiene exactamente una rúbrica compartida por todos sus proyectos.
- La suma de todos los valores Excelente debe ser exactamente 10.00 para que la rúbrica sea válida.

### Criterios de aceptación

- [ ] Escribir en el filtro #53 muestra lista de módulos asignados al profesor que coinciden (case-insensitive, tras 300ms)
- [ ] Módulos no asignados al profesor no aparecen en el filtro #53
- [ ] Seleccionar un módulo carga sus ítems de rúbrica en el grid #56
- [ ] Limpiar el filtro #53 limpia la lista y muestra el grid #56 vacío
- [ ] Pulsar Nuevo (#55) añade una nueva fila editable directamente en el grid; no se abre modal
- [ ] Si existe alguna corrección para la rúbrica del módulo, pulsar Nuevo muestra un aviso bloqueante y no se añade ninguna fila
- [ ] Tras guardar el nuevo ítem, #64 se actualiza con el nuevo total
- [ ] Los campos del grid son siempre visibles y no requieren doble click para editar (salvo rúbrica congelada)
- [ ] Cambiar un valor de Excelente y perder el foco auto-guarda en la BD
- [ ] El valor de Excelente debe ser mayor que Muy bien; la violación bloquea el guardado
- [ ] El valor de Muy bien debe satisfacer Excelente > Muy bien > Bien; la violación bloquea el guardado
- [ ] El valor de Bien debe satisfacer Muy bien > Bien > Regular; la violación bloquea el guardado
- [ ] El valor de Regular debe satisfacer Bien > Regular > 0; la violación bloquea el guardado
- [ ] La celda Mal siempre muestra 0.00 y no es editable
- [ ] #64 muestra la suma correcta de todos los valores Excelente y se actualiza en tiempo real tras cada guardado
- [ ] Cuando la suma es 10.00, #64 se muestra con estilo normal
- [ ] Cuando la suma ≠ 10.00, #64 se muestra en rojo indicando rúbrica inválida
- [ ] Se aceptan ficheros YAML, CSV y JSON para la subida (#63); cualquier otro formato muestra un error
- [ ] Si no hay módulo activo al subir, se muestra un error solicitando seleccionar primero un módulo
- [ ] Si existe alguna corrección para la rúbrica del módulo, la subida (#63) muestra un aviso bloqueante
- [ ] Si existe rúbrica previa sin correcciones, se muestra una confirmación de reemplazo antes de proceder
- [ ] Tras la subida, #56 y #64 se refrescan
- [ ] Un diálogo de confirmación aparece antes del borrado de un ítem (#90)
- [ ] Si la rúbrica del módulo ha sido usada en alguna corrección, el borrado de un ítem es bloqueado con un aviso
- [ ] Tras borrar un ítem, #64 se recalcula inmediatamente
- [ ] Si la suma resultante ya no es 10.00, la rúbrica queda marcada como inválida

---

## UC-09: Corrección de Proyecto

**Actor principal**: Profesor  
**Precondiciones**: El profesor está autenticado. Está en la pantalla de corrección. Existe al menos un proyecto con rúbrica válida (suma Excelente = 10.00).  
**Elementos del boceto**: #65 (filtro año), #66 (filtro ciclo), #67 (filtro módulo), #68 (select proyecto), #69 (grid corrección), #70 (nombre ítem, read-only), #71 (celda Excelente), #72 (celda Muy bien), #73 (celda Bien), #74 (celda Regular), #75 (celda Mal), #76 (puntuación actual), #77 (checkbox grupo), #78 (checkbox alumno 1), #79 (checkbox alumno 2), #80 (checkbox alumno 3)  
**Fase RAG**: use-case

### Flujo principal — Seleccionar proyecto

1. El profesor accede a la pantalla de corrección.
2. Los filtros #65 (año), #66 (ciclo), #67 (módulo) se usan para acotar la lista de proyectos en el select #68.
3. El filtro #65 muestra el año académico actual por defecto.
4. El filtro #67 muestra solo los módulos asignados al profesor.
5. El profesor selecciona un proyecto en el select #68. El grid #69 aparece y muestra el mensaje `Elige una opción para empezar a corregir`. La puntuación #76 muestra 0.
6. Todos los checkboxes (#77–#80) están desmarcados al cargar.

### Flujo principal — Corrección en modo grupo

1. El profesor marca el checkbox Grupo (#77).
2. El grid #69 carga los ítems de la rúbrica con las notas previamente guardadas en modo grupo (si existen).
3. Los checkboxes individuales #78–#80 quedan deshabilitados y desmarcados.
4. El profesor hace click en la celda de nivel deseado (Excelente/Muy bien/Bien/Regular/Mal) en la fila del ítem a corregir.
5. La selección se guarda asíncronamente en la BD para TODOS los alumnos del proyecto.
6. La puntuación #76 se actualiza en tiempo real.

### Flujo principal — Corrección individual por alumno

1. El profesor marca el checkbox de un alumno individual (#78, #79 o #80).
2. Su nombre_completo (de la tabla segura) se muestra como etiqueta del checkbox.
3. El grid #69 carga los ítems con las notas previamente guardadas para ese alumno.
4. El profesor corrige ítem a ítem. Cada selección se guarda asíncronamente.
5. La puntuación #76 se actualiza en tiempo real.
6. Solo un alumno individual puede estar activo a la vez; activar uno desmarca los demás.

### Flujos alternativos

- **A1 — Sin checkbox activo al hacer click en celda**: Aparece una notificación deslizante en la parte derecha indicando que debe seleccionar un grupo o alumno primero. El click no se guarda.
- **A2 — Rúbrica inválida**: Si la rúbrica del módulo tiene suma Excelente ≠ 10.00, se muestra un error en lugar del grid pidiendo al profesor que arregle la rúbrica. El grid no carga.
- **A3 — Nuevo proyecto seleccionado**: Todas las selecciones de nivel y la puntuación #76 se resetean a 0.
- **A4 — Re-corrección**: El profesor puede cambiar un nivel ya seleccionado en cualquier momento; el nuevo valor sobrescribe al anterior sin confirmación.
- **A5 — #79 o #80 ocultos**: El checkbox del alumno 2 (#79) no se renderiza si el proyecto tiene solo 1 alumno. El checkbox del alumno 3 (#80) no se renderiza si el proyecto tiene menos de 3 alumnos.

### Postcondiciones

- Las correcciones se almacenan en la tabla `correcciones` por alumno + proyecto + rubrica_item.
- Una corrección con todos los ítems calificados está marcada como completa para ese alumno.

### Criterios de aceptación

- [ ] El filtro #65 muestra el año académico actual por defecto
- [ ] El filtro #67 solo muestra los módulos asignados al profesor autenticado
- [ ] El select #68 muestra todos los proyectos que coinciden con los tres filtros, sin filtrar por estado de corrección
- [ ] Seleccionar un proyecto en #68 muestra el mensaje `Elige una opción para empezar a corregir` en el grid
- [ ] Seleccionar un proyecto resetea todas las selecciones de nivel y pone #76 a 0
- [ ] El grid #69 no se muestra hasta que se selecciona un proyecto en #68
- [ ] Si la rúbrica del módulo es inválida (suma Excelente ≠ 10.00), se muestra un error en lugar del grid
- [ ] Todos los checkboxes (#77–#80) empiezan desmarcados al cargar la pantalla o cambiar de proyecto
- [ ] Marcar #77 (grupo) deshabilita y desmarca #78, #79, #80 y muestra el grid con los ítems de la rúbrica
- [ ] Con #77 marcado, hacer click en una celda de nivel guarda la nota para TODOS los alumnos del proyecto
- [ ] Desmarcar #77 reactiva #78, #79, #80 y el grid vuelve al mensaje `Elige una opción para empezar a corregir`
- [ ] Las notas guardadas en modo grupo aparecen pre-seleccionadas al activar después un checkbox individual
- [ ] La etiqueta de cada checkbox individual (#78–#80) muestra el nombre_completo del alumno correspondiente
- [ ] El checkbox #79 no se renderiza si el proyecto tiene solo 1 alumno
- [ ] El checkbox #80 no se renderiza si el proyecto tiene menos de 3 alumnos
- [ ] Marcar un checkbox individual (#78, #79 o #80) desmarca los demás y muestra las notas previamente guardadas para ese alumno
- [ ] Con un checkbox individual activo, hacer click en una celda de nivel guarda la nota solo para ese alumno
- [ ] Si no hay ningún checkbox activo al hacer click en una celda, aparece una notificación deslizante y el click no se guarda
- [ ] #76 se actualiza inmediatamente tras cada selección válida (con checkbox activo)
- [ ] El valor #76 es igual a la suma de todos los niveles seleccionados para el alumno/grupo activo
- [ ] La celda Mal tiene siempre el valor 0; contribuye 0 a #76
- [ ] El nombre del ítem en la columna #70 no es editable en la pantalla de corrección
- [ ] Seleccionar un nivel diferente en una celda ya calificada sobrescribe el anterior sin confirmación

---

## UC-10: Visualización e impresión de Notas

**Actor principal**: Profesor / Tutor  
**Precondiciones**: El usuario está autenticado. El rol Tutor accede únicamente a esta pantalla. El rol Profesor navega desde su landing.  
**Elementos del boceto**: #30 (botón Imprimir notas — tutor), #85 (select año), #86 (select ciclo), #87 (select módulo), #88 (botón Descargar PDF), #89 (tabla previsualización)  
**Fase RAG**: use-case

### Flujo principal — Seleccionar filtros en cascada

1. El usuario accede a `/profesor/notas`.
2. El select #85 muestra los años académicos disponibles (valores `año_académico` distintos de los proyectos existentes).
3. El usuario selecciona un año en #85. El select #86 se recarga con los ciclos activos para ese año; el select #87 y el botón #88 se resetean.
4. El usuario selecciona un ciclo en #86. El select #87 se recarga con los módulos asignados al profesor autenticado para ese ciclo; el botón #88 permanece deshabilitado.
5. El usuario selecciona un módulo en #87. La tabla de previsualización #89 se carga con los datos. El botón #88 se habilita.

### Flujo principal — Previsualización y descarga PDF

1. La tabla #89 muestra columnas: Proyecto, Nombre alumno, Niveles evaluados, Nota final.
2. **Niveles evaluados**: para cada alumno, el recuento de ítems calificados en cada nivel del módulo seleccionado (Excelente: N, Muy bien: N, Bien: N, Regular: N, Mal: N).
3. **Nota final**: media ponderada de todos los módulos del ciclo: `Σ (nota_módulo_i × (horas_módulo_i / Σ horas_todos_módulos_ciclo))`. Los módulos sin corrección contribuyen 0.
4. Los alumnos con correcciones incompletas aparecen con sus datos parciales y un indicador `incompleto` en su fila.
5. Si algún módulo del ciclo no tiene correcciones, se muestra un aviso listando los módulos pendientes.
6. El usuario pulsa Descargar PDF (#88). Se genera y descarga un fichero PDF (no diálogo de impresión del navegador).
7. El PDF contiene: cabecera con los tres valores de filtro, tabla con las cuatro columnas, y nota al pie si hay módulos sin corregir.

### Flujos alternativos

- **A1 — #88 deshabilitado**: El botón está deshabilitado mientras cualquiera de #85, #86, #87 esté vacío.
- **A2 — Acceso del Tutor**: El botón #30 en la landing del profesor es visible solo para el rol Tutor y navega a `/profesor/notas`. Para el rol Profesor, el botón #30 no se renderiza.
- **A3 — Acceso no autorizado del Tutor**: Si el Tutor intenta navegar a cualquier ruta que no sea `/profesor/notas`, es redirigido a `/profesor/notas`.

### Postcondiciones

- El fichero PDF queda descargado en el dispositivo del usuario.
- Los datos del PDF son idénticos a los de la previsualización #89.

### Criterios de aceptación

- [ ] El botón #30 se renderiza cuando el usuario autenticado tiene rol tutor
- [ ] El botón #30 no se renderiza cuando el usuario autenticado tiene rol profesor
- [ ] El select #85 muestra los valores `año_académico` distintos de los proyectos existentes
- [ ] El select #86 está deshabilitado hasta que #85 tiene valor
- [ ] Seleccionar un valor en #85 recarga #86 y resetea #86 y #87
- [ ] El select #87 está deshabilitado hasta que #86 tiene valor
- [ ] Seleccionar un valor en #86 recarga #87 con solo los módulos asignados al profesor autenticado para ese ciclo
- [ ] Seleccionar un valor en #87 carga la tabla previsualización #89
- [ ] El botón #88 está deshabilitado mientras cualquiera de #85, #86, #87 esté vacío
- [ ] El botón #88 se habilita cuando los tres selects tienen valor
- [ ] La tabla #89 está oculta hasta que #87 tiene valor
- [ ] La tabla #89 muestra columnas: Proyecto, Nombre alumno, Niveles evaluados, Nota final
- [ ] La columna Niveles evaluados muestra el recuento de ítems por nivel para cada alumno en el módulo seleccionado
- [ ] Los alumnos con correcciones incompletas aparecen con sus datos parciales y un indicador `incompleto`
- [ ] nota_final es la media ponderada de todos los módulos del ciclo: cada módulo × (horas_módulo / Σ horas_módulos_ciclo)
- [ ] Los módulos sin corrección contribuyen 0 a la nota_final
- [ ] Cuando algún módulo no tiene correcciones, se muestra un aviso listando los módulos pendientes
- [ ] Los datos de la previsualización #89 coinciden con los datos del PDF descargado
- [ ] Pulsar #88 descarga un fichero PDF (no diálogo de impresión del navegador)
- [ ] El PDF contiene cabecera con los tres valores de filtro, tabla con las cuatro columnas, y nota al pie si hay módulos sin corregir
- [ ] Un usuario con rol Tutor que intenta acceder a una ruta distinta de `/profesor/notas` es redirigido a `/profesor/notas`
