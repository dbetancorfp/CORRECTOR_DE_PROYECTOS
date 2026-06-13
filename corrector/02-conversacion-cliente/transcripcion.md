# Transcripción de entrevista — Corrector de Proyectos

**Cliente:** Profesor FP
**Feature ID:** corrector-v1

---

## Objetivo de la aplicacion

Construir una aplicacion web para que los profesores corrijan los proyectos de los alumnos que se presentan cada añoo, con reglas de evaluacion claras, calculo de nota final y gestion academica por parte del Administrador.

## Contexto academico

- Cada año se corrigen proyectos de los ciclos Administración de Sistemas Informáticos en Red (ASR), Desarrollo de Aplicaciones Web (DAW) y Desarrollo de Aplicaciones Multiplataforma (DAM).
- Cada ciclo esta compuesto por modulos de primero y segundo curso.
- La jerarquía del dominio es: Ciclo → Módulos → Proyectos → Alumnos. Los proyectos pertenecen al módulo, no directamente al ciclo.
- Cada módulo puede tener cero o varios proyectos.
- Cada proyecto puede ser defendido por uno, dos o tres alumnos.

## Evaluacion

- Cada alumno sera evaluado mediante la rubrica de cada modulo.
- La suma máxima de una rubrica no puede superar 10 puntos.
- La nota de cada modulo esta ponderada segun las horas semanales del modulo.
- La nota máxima de cada modulo es 10 puntos.
- La nota final del ciclo tambien debe quedar limitada a 10 puntos.

## Profesorado

- Cada modulo sera impartido por un unico profesor.
- El profesor se autenticará mediante el **nombre de usuario de la Consejería de Educación** (ej. `dbetqui`) y contraseña. No se usa el correo electrónico.
- La contrasena por defecto sera `12345678`.
- Cuando un profesor o administrador inicie sesion por primera vez, debera cambiar su contrasena obligatoriamente.
- El profesor podrá listar los alumnos por proyecto para ver su nota de proyecto.

## Flujo del profesor una vez autenticado

Una vez autenticado, el profesor podra:

1. Podrá elegir entre Corregir proyectos, Gestionar rúbrica o Ver notas de alumnos
2. Si elige Corregir proyectos, seguira el flujo:
  a. Elegir el anio academico. Por defecto, aparecera el actual.
  b. Elegir el ciclo.
  c. Elegir el proyecto que desea corregir.
  d. Seleccionar el alumno que va a evaluar.
  e. Corregir al alumno utilizando la rubrica creada para sus modulos.
  f. Pulsar en Guardar y finalizar para actualizar la nota final del alumno.
3. Si elige Gestionar rubrica, seguira el flujo:
  a. Elegir el anio academico. Por defecto, aparecera el actual.
  b. Elegir el ciclo.
  c. Elegir el modulo que imparte.
  d. Crear, editar o borrar la rubrica del modulo, asegurandose de que la suma máxima no supere los 10 puntos.
  e. La rúbrica se compone de un criterio de evaluación, y una escala de puntuación de 5 niveles, como mínimo, con su correspondiente puntuación. El profesor podrá añadir tantos criterios como necesite, pero la suma de las puntuaciones máximas de cada criterio no podrá superar los 10 puntos.
  f. Guardar la rubrica para que quede asociada al modulo y pueda ser utilizada en las evaluaciones.
4. Si elige Ver notas de alumnos, seguira el flujo:
  a. Elegir el año academico. Por defecto, aparecera el actual.
  b. Elegir el ciclo.
  c. Al final de los filtros abrá un botón para descargar un excel con la misma informacion que se muestra en la lista de alumnos, incluyendo, el proyecto, la nota de cada modulo y la nota final del proyecto para cada alumno.
  d. Debajo de los filtros aparecerá unos label con las siglas de cada módulo. Si el profesor que imparte el módulo ya puso las notas a todos los alumnos el fonde del color del label aparecerá en verde, si no, en rojo
  e. Debajo de los labels anteriores aparecerá una lista de alumnos con su nota final de proyecto y su nota de cada modulo. La lista contendrá como columna primera el nombre del proyecto (ordenados alfabéticamente), luego los alumnos agrupados por proyecto (oredenados alfabéticmente por apellido), luego la nota de cada modulo que compone el ciclo y luego la nota final del proyecto.

---

## Aclaraciones de comportamiento (sesión de entrevista)

### Login y autenticación - index.html (#1–#3)

- Si el usuario introduce credenciales incorrectas, se muestra el mensaje "Credenciales incorrectas" en la misma pantalla del login.
- Se permiten un máximo de 3 intentos fallidos consecutivos. Al tercer intento fallido se muestra el mensaje "Póngase en contacto con el Administrador" y la cuenta queda bloqueada.
- El desbloqueo de cuenta lo realiza el Administrador.
- En el primer acceso (contraseña por defecto `12345678`), en la misma pantalla del login aparecen dos campos de texto adicionales para introducir la nueva contraseña dos veces. Si ambas coinciden, se actualiza la base de datos y se redirige a la landing page correspondiente al rol. Si no coinciden, se muestra un error en la misma pantalla y se repite el proceso.

### Administración — reglas de borrado

- El borrado de un Ciclo queda **bloqueado** si tiene Módulos asociados. El usuario debe eliminar primero todas las dependencias antes de poder borrar el Ciclo.
- El mismo principio aplica en cascada: no se puede borrar un Módulo si tiene Proyectos asociados.

### Administración — Tab Legislación - vista_admin-tab_legislacion_seleccionado.html (#4–#10)

- #4 Tab de legislación seleccionado: muesta los elementos para la gestiṕon de legislaciones.
- Para crear una nueva legislación introducimos los campos nombre (#5) y año inicio (#6), y pulsamos el botón Guardar (#7) para persistir 
    en la base de datos. Y como la tabla #10 es reactiva se añadirá automáticamente a la tabla sin necesidad de recargar la página, siempre que los 
   filtros #8 y #9 no lo oculten.
- Hay unos filtros de búsqueda (#8 año inicio, #9 nombre) que permiten acotar las legislaciones mostradas en la tabla #10. 
    Son filtros de texto libre con filtrado reactivo: conforme el usuario escribe, la tabla se actualiza automáticamente para mostrar solo
    las legislaciones que coinciden con los criterios de búsqueda.
- La tabla #10 muestra las legislaciones existentes con sus campos: año inicio y nombre, según aplique los filtros #8 (año inicio) y #9 (nombre),
   la tabla se actualiza automáticamente para mostrar solo las legislaciones que coinciden con los criterios de búsqueda.
- No se puede borrar una Legislación si tiene Ciclos asociados.


### Administración — Tab Ciclos - vista_admin-tab_ciclos_seleccionado.html (#11–#21)

- #11 Cabecera.
- #12 Tab "Ciclos" seleccionado: muestra los elementos para la gestión de ciclos.
- Para crear un nuevo ciclo introducimos los campos nombre (#13), selector de año de inicio (#14) y legislación (#15). 
    Pulsando el botón Guardar (#16) se persiste en la base de datos y se añade automáticamente a la tabla #20 sin necesidad de recargar la página,
    siempre que los filtros #17, #18 y #19 no lo oculten.
- Hay unos filtros de búsqueda (#17 año inicio, #18 nombre, #19 legislación) que permiten acotar los ciclos mostrados en la tabla #20. 
    Son filtros de texto libre con filtrado reactivo: conforme el usuario escribe, la tabla se actualiza automáticamente para mostrar solo
    los ciclos que coinciden con los criterios de búsqueda.   

- Un ciclo es únicamente un nombre (p. ej. "Desarrollo de Aplicaciones Web (DEW)"). **No lleva legislación asociada directamente.**
- La legislación se asocia a los módulos, no al ciclo.
- La jerarquía corregida queda: Ciclo → Módulos (cada módulo lleva su legislación) → Proyectos → Alumnos.


### Administración — Tab Módulos - vista_admin-tab_modulos_seleccionado.html (#22-#32)

- #22 Tab "Módulos" seleccionado: muestra los elementos para la gestión de módulos.
- Para crear un nuevo módulo introducimos los campos nombre (#23), seleccionamos en ciclo (#24), seleccionamos el año de inicio (#25), 
    selector de horas semanales (#26) y selector de ciclo (#27). 
    Pulsando el botón Guardar (#28) se persiste en la base de datos y se añade automáticamente a la tabla #32 sin necesidad de recargar la página,
    siempre que los filtros #29, #30 y #31 no lo oculten.
- El formulario de creación de un módulo tiene exactamente cinco campos: nombre, siglas, legislación, horas semanales y ciclo.
- La tabla (#18) muestra esos mismos cinco campos más los iconos de Editar (#21) y Borrar (#22).




@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@


### Administración — Tab Profesorado (#25)

- La columna Contraseña muestra el valor `12345678` mientras el profesor no haya cambiado su contraseña (indica que el primer acceso está pendiente).
- Una vez que el profesor cambia su contraseña, la columna muestra asteriscos (`********`) en lugar del valor real.

### Tab Proyectos — formulario y gestión (#46–#51)

- El formulario de nuevo proyecto (#46) es un **modal** con tres campos: **nombre**, **ciclo** y **alumnos**.
  - El campo "ciclo" sirve para filtrar la lista de alumnos disponibles.
  - El campo "alumnos" muestra una lista de alumnos del ciclo seleccionado que **no han sido asignados a ningún proyecto** todavía. El profesor marca los que participan en el proyecto (1 a 3 alumnos).
  - El proyecto queda implícitamente vinculado al módulo activo seleccionado previamente con #42.
- ⚠️ **Corrección del boceto**: el elemento #49 (Columna Añadir alumnado — icono rueda dentada) queda **eliminado**. La asignación de alumnado se realiza dentro del propio formulario modal de creación (#46), no como acción separada en la tabla.
- Borrado de proyecto (#51): queda bloqueado si el proyecto tiene correcciones guardadas. Se muestra un mensaje de aviso.
- Un alumno solo puede pertenecer a un proyecto a la vez (no aparece en la lista si ya está asignado).

### Pantalla Corregir Proyecto — desplegable de proyectos (#68)

- El desplegable #68 muestra **todos los proyectos** que quedan tras aplicar los tres filtros (#65 año, #66 ciclo, #67 módulo). No se filtran por estado de corrección ni por presencia de alumnos.

### Tab Rúbrica — estructura de la tabla y validaciones (#55–#64, #90)

- #55 (Botón Nuevo): añade una fila nueva a la tabla con los campos inmediatamente editables; no abre modal.
- #57 (Nombre del ítem) es un **input text** siempre visible; no requiere activar modo edición.
- #58–#61 (Excelente, Muy bien, Bien, Regular) son **input number con 2 decimales** siempre visibles. El profesor edita directamente.
- #62 (Mal): valor **fijo siempre igual a 0.00**. No es editable. Se muestra como campo de solo lectura.
- Los valores de los niveles editables (#58–#61) deben estar ordenados de **mayor a menor**: Excelente > Muy bien > Bien > Regular > 0. El sistema valida este orden.
- Cada ítem tiene su propia valoración independiente por nivel.
- **Regla crítica**: la suma de todos los valores "Excelente" (#58) de todos los ítems debe ser **exactamente 10.00** — ni más ni menos. El sistema no permite guardar o abandonar la celda si la suma resultante supera o es inferior a 10.
- #63 (Subir rúbrica): formato **YAML**. Si ya existe una rúbrica para el módulo, la subida de un nuevo fichero **borra la anterior y escribe la nueva**. Se muestra un aviso al usuario de pérdida de datos antes de confirmar.
- #64 (Puntuación máxima): muestra la suma de los valores "Excelente" de todos los ítems en tiempo real. Debe mostrar siempre 10.00 cuando la rúbrica es válida.
- #90 (Icono Borrar — ítem rúbrica): elimina la fila del ítem. Al borrar, la puntuación máxima se recalcula en #64 y el sistema vuelve a requerir que la suma llegue a 10.00 antes de que la rúbrica sea válida.

### Tab Rúbrica — aclaración del dominio (#52–#64)

- La rúbrica pertenece al **módulo**, no al proyecto. Un módulo tiene una única rúbrica que aplica a todos sus proyectos.
- El filtro #53 del boceto está etiquetado "por proyecto" pero debe filtrar **por módulo**. Es una inconsistencia del boceto que debe corregirse en fases posteriores del pipeline.

### Tab Proyectos — botón Seleccionar módulo (#42)

- El botón #42 carga los módulos asignados al profesor autenticado, dado que un módulo puede tener varios proyectos. El profesor debe seleccionar primero su módulo para ver y gestionar los proyectos que le corresponden.

### Ver notas — cálculo de nota final y output (#flujo-ver-notas)

- Cada módulo puntúa sobre 10. La nota de módulo se calcula a partir de la rúbrica: suma de los niveles seleccionados por ítem, con un máximo de 10.
- La nota final se calcula como la **suma de las notas de cada módulo ponderadas por el peso de ese módulo**, donde el peso es proporcional a las horas semanales del módulo sobre el total de horas del ciclo. Un alumno con "Excelente" en todos los ítems de todos los módulos obtiene exactamente 10 en la nota final.
- Fórmula: `nota_final = Σ (nota_módulo_i × (horas_módulo_i / horas_totales_ciclo))`
- El output de "Ver notas" es un **PDF descargable** (no Excel). La descripción original que mencionaba Excel queda corregida.
- El PDF muestra: nombre del Ciclo como cabecera, seguido de una tabla con todos los alumnos agrupados por Proyecto (filas) y la nota obtenida por módulo (columnas).
- "Grupo" era un lapsus; el término correcto es **Proyecto**.

### Pantalla Corregir Proyecto — guardado automático y re-corrección (#69–#76)

- **No existe botón "Guardar y finalizar" ni "Guardar borrador"**. El guardado es automático: al seleccionar un nivel para un ítem, la puntuación se guarda primero en local y luego se persiste en la base de datos de forma **asíncrona**.
- #71–#75 (celdas seleccionables por ítem) funcionan como radio buttons por fila: solo puede estar seleccionado un nivel a la vez. Si el profesor pulsa otro nivel, el anterior se deselecciona y el nuevo se guarda.
- Un profesor puede re-corregir a un alumno en cualquier momento seleccionando otro nivel; la nota anterior queda sobreescrita.
- **Todos los ítems son obligatorios**. Una corrección no se considera completa hasta que todos los ítems tienen un nivel seleccionado.
- #76 (Puntuación obtenida): se actualiza en tiempo real conforme el profesor selecciona niveles.

### Pantalla Corregir Proyecto — flujo de carga (#65–#69)

- Los filtros #65 (año), #66 (ciclo) y #67 (módulo) acotan las opciones disponibles.
- El filtro #67 muestra únicamente los módulos asignados al profesor autenticado (no todos los módulos del ciclo).
- La tabla de corrección #69 se carga únicamente después de que el usuario ha aplicado los tres filtros y ha seleccionado un proyecto en el desplegable #68.

### Pantalla Corregir Proyecto — obligatoriedad de puntuación (#65–#80)

- Todos los ítems de la rúbrica son obligatorios para cada alumno. Si el profesor intenta salir de la pantalla con ítems sin puntuar, el sistema avisa.
- Además, todos los alumnos del proyecto deben tener todos sus ítems puntuados antes de que la corrección se considere completa.

### Pantalla Corregir Proyecto — checkboxes de alumno (#77–#80)

- Los checkboxes #77 (Corregir por grupo) y #78–#80 (Alumno 1, 2, 3) forman un grupo de selección exclusiva:
  - Si se marca #77, se desmarcan #78, #79 y #80. La puntuación de cada ítem se asigna a **todos los alumnos del proyecto**.
  - Si se marca cualquiera de #78, #79 o #80, se desmarca #77 y los demás checkboxes de alumno individual. Solo se puede seleccionar **un alumno individual a la vez**. La puntuación de cada ítem se asigna únicamente a ese alumno.

### Landing Profesor — Rol Tutor (#30)

- El Tutor puede acceder a "Visualizar notas" y a "Imprimir notas". No puede acceder a "Gestionar" ni a "Corregir".
- #30 (Botón Imprimir notas): genera un **PDF descargable**. No abre el diálogo de impresión del navegador.

### Tab Alumnos — formulario y gestión (#35, #40, #41)

- El formulario de nuevo alumno (#35) tiene exactamente tres campos: **identificador/código** (nombre de usuario anonimizado, ej. `JJ499`), **ciclo** y **legislación**. No se almacena el nombre real del alumno en la tabla principal.
- Privacidad: la aplicación usa identificadores anónimos. Los nombres reales se guardan en una tabla separada con nivel de seguridad elevado, que relaciona nombre real ↔ identificador. Esta tabla se carga también desde el fichero de importación.
- Borrado (#40): si el alumno tiene dependencias (notas, proyectos), se muestra un aviso emergente (pop-up) indicando que deben eliminarse las dependencias antes de poder borrar el alumno. El borrado queda bloqueado hasta que se resuelvan.
- Subida masiva (#41): el fichero tiene formato **YAML** y contiene los campos: `nombre_completo`, `identificador`, `ciclo` y `legislación`. El proceso carga el identificador, ciclo y legislación en la tabla principal de alumnos, y el par nombre_completo ↔ identificador en la tabla segura.



### Administración — Cuenta de Administrador

- Solo puede existir **un único administrador** en el sistema.
- Está registrado en la base de datos con: nombre de usuario `Admin` y contraseña por defecto `12345678`.
- En el primer acceso, el flujo de cambio de contraseña muestra dos campos (nueva contraseña y confirmación). Si no coinciden, se muestra aviso de error y se concede **una única oportunidad adicional**. Si falla también esa segunda oportunidad, se redirige de vuelta a la pantalla de login (sin bloqueo de cuenta).
- Si coinciden, se guarda la nueva contraseña y se redirige a la vista de Administrador.

### Año académico — formato global

- El año académico se representa como un **único año entero** correspondiente al año de inicio del curso (ej. `2025` → curso 2025-2026).
- Los filtros de año (#44, #54, #65) aceptan texto libre con ese formato.
- Por defecto, los filtros muestran el año académico en curso.



### Administración — Tab Profesorado: identificador de usuario (#23–#27)

- El campo "Nombre" en la tabla de profesorado es el **nombre de usuario de la Consejería de Educación** (ej. `dbetqui`), no el correo electrónico.
- El campo #1 (Campo usuario) del login es el nombre de usuario de Consejería (ej. `dbetqui`) para los profesores. El administrador usa el nombre de usuario literal `Admin` (cuenta de sistema, no de Consejería).
- Los roles Admin y Profesor son estrictamente separados. La cuenta `Admin` no puede corregir proyectos ni acceder a las vistas de Profesor.
- El formulario de nuevo profesor (#24) tiene cuatro campos: **nombre de usuario de Consejería**, **nombre completo**, **ciclo(s)** y **módulo(s)**. La tabla #25 muestra estos mismos datos más la columna de contraseña.
- Un profesor puede tener módulos asignados de **distintos ciclos** (no está restringido a un único ciclo).

### Comportamiento Editar en todas las tablas (#14, #21, #28, #39, #50, #83 y equivalentes)

- Al pulsar el icono Editar en cualquier tabla, **se activa la edición inline directamente en la fila**. No se abre ningún modal.
- El borrado de cualquier entidad con dependencias queda bloqueado con un mensaje de aviso (patrón uniforme): Legislación, Ciclo, Módulo, Profesor, Alumno, Proyecto.
- Borrar Profesor (#29): bloqueado si el profesor tiene módulos asignados o correcciones guardadas.

### Ver notas — pantalla y generación del PDF (#85–#89)

- Nuevo boceto creado: `vista_profesor-landing-ver_notas.html` (elementos #85–#89).
- La pantalla tiene tres **filtros enlazados en cascada**: #85 año académico → #86 ciclo → #87 módulo. Los módulos disponibles en #87 están limitados a los asignados al profesor autenticado.
- El botón #88 (Descarga PDF) genera el PDF parametrizado con los valores seleccionados en los tres filtros.
- El PDF contiene: los filtros usados como cabecera, seguido de una tabla con columnas: **Proyecto**, **Nombre alumno**, **Niveles evaluados**, **Nota final**.
- La tabla #89 muestra una vista previa en pantalla del mismo contenido antes de descargar.

### Tab Rúbrica — guardado automático de celdas (#57–#61)

- Al abandonar cualquier celda editable de la rúbrica (on blur), el valor se persiste en la base de datos de forma automática. No hay botón "Guardar rúbrica" explícito.

### Validaciones de campos de formulario — reglas globales

- **Siglas** (legislación #7, módulo): deben ser **únicas en el sistema**, escritas en **mayúsculas**, con una longitud máxima de **10 caracteres**.
- **Años de legislación** (#8 año inicio, #9 año finalización): el año de finalización debe ser exactamente el año de inicio más uno (`año_fin = año_inicio + 1`). Ambos campos son enteros de 4 dígitos.
- **Éxito al guardar** (#10 y todos los botones Guardar equivalentes): tras persistir un nuevo registro, la tabla **se refresca leyendo de la base de datos** (el nuevo registro ya estará incluido). No hay inserción optimista en cliente.
- El formulario no se limpia automáticamente tras guardar; se refresca la tabla y el formulario queda disponible para una nueva entrada.

### Tabla de Profesorado — columnas Ciclo y Módulos (#26, #27)

- Si un profesor imparte módulos de varios ciclos, la columna **Módulos** (#27) muestra las siglas de todos los módulos separadas por coma (ej. `DEW, DAW`).
- La columna **Ciclo** (#26) muestra igualmente todos los ciclos asociados al profesor separados por coma cuando hay más de uno.

### Tab Proyectos — año académico en formulario Nuevo (#46)

- El formulario modal de nuevo proyecto tiene **cuatro campos**: nombre, año académico, ciclo y alumnos.
- El campo año académico es un `select` cuya primera opción por defecto es el año académico en curso. El profesor puede cambiarlo para crear proyectos de años anteriores.

### Patrón de filtros en toda la aplicación (#32–#34, #43–#45, #53–#54, #65–#67, #85–#87)

- Los filtros sobre tablas son siempre **input text con filtrado reactivo**: la tabla se actualiza automáticamente conforme el usuario escribe, sin necesidad de pulsar ningún botón.
- Los campos de **formularios modales** (Nuevo/Editar) usan `select` cuando el campo toma valores de una lista cerrada (ciclo, legislación, módulo, alumnos).

### Pantalla Corregir Proyecto — estado inicial de checkboxes (#77–#80)

- Al entrar en la pantalla de corrección, todos los checkboxes (#77 Corregir por grupo, #78 Alumno 1, #79 Alumno 2, #80 Alumno 3) están **desmarcados por defecto**. El profesor debe seleccionar explícitamente el modo de corrección antes de puntuar.

### Barra de navegación — Botón Salir (#5)

- Al pulsar "Salir", la sesión se cierra inmediatamente: se destruyen la cookie/token de sesión y el usuario es redirigido a la pantalla de login.
- No se muestra ningún diálogo de confirmación antes de cerrar sesión.
