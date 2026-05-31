# Transcripción de entrevista — Corrector de Proyectos

**Cliente:** David Betancor, Profesor FP · IES Telesforo Bravo
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
- El profesor se autenticara mediante correo electronico y contrasena.
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
  a. Elegir el anio academico. Por defecto, aparecera el actual.
  b. Elegir el ciclo.
  c. Al final de los filtros abrá un botón para descargar un excel con la misma informacion que se muestra en la lista de alumnos, incluyendo, el proyecto, la nota de cada modulo y la nota final del proyecto para cada alumno.
  d. Debajo de los filtros aparecerá unos label con las siglas de cada módulo. Si el profesor que imparte el módulo ya puso las notas a todos los alumnos el fonde del color del label aparecerá en verde, si no, en rojo
  e. Debajo de los labels anteriores aparecerá una lista de alumnos con su nota final de proyecto y su nota de cada modulo. La lista contendrá como columna primera el nombre del proyecto (ordenados alfabéticamente), luego los alumnos agrupados por proyecto (oredenados alfabéticmente por apellido), luego la nota de cada modulo que compone el ciclo y luego la nota final del proyecto.

---

## Aclaraciones de comportamiento (sesión de entrevista)

### Login y autenticación (#1–#3)

- Si el usuario introduce credenciales incorrectas, se muestra el mensaje "Credenciales incorrectas" en la misma pantalla del login.
- Se permiten un máximo de 3 intentos fallidos consecutivos. Al tercer intento fallido se muestra el mensaje "Póngase en contacto con el Administrador" y la cuenta queda bloqueada.
- El desbloqueo de cuenta lo realiza el Administrador.
- En el primer acceso (contraseña por defecto `12345678`), en la misma pantalla del login aparecen dos campos de texto adicionales para introducir la nueva contraseña dos veces. Si ambas coinciden, se actualiza la base de datos y se redirige a la landing page correspondiente al rol. Si no coinciden, se muestra un error en la misma pantalla y se repite el proceso.

### Administración — reglas de borrado

- El borrado de un Ciclo queda **bloqueado** si tiene Módulos asociados. El usuario debe eliminar primero todas las dependencias antes de poder borrar el Ciclo.
- El mismo principio aplica en cascada: no se puede borrar un Módulo si tiene Proyectos asociados.

### Administración — Tab Legislación (#7–#10, #81–#84)

- El boceto ha sido corregido: ahora incluye botón Nuevo (#81), tabla de legislaciones (#82) y acciones Editar (#83) y Borrar (#84), en línea con los demás tabs de administración.
- No se puede borrar una Legislación si tiene Ciclos asociados.

### Administración — Tab Profesorado (#25)

- La columna Contraseña muestra el valor `12345678` mientras el profesor no haya cambiado su contraseña (indica que el primer acceso está pendiente).
- Una vez que el profesor cambia su contraseña, la columna muestra asteriscos (`********`) en lugar del valor real.

### Tab Rúbrica — aclaración del dominio (#52–#64)

- La rúbrica pertenece al **módulo**, no al proyecto. Un módulo tiene una única rúbrica que aplica a todos sus proyectos.
- El filtro #53 del boceto está etiquetado "por proyecto" pero debe filtrar **por módulo**. Es una inconsistencia del boceto que debe corregirse en fases posteriores del pipeline.

### Tab Proyectos — botón Seleccionar módulo (#42)

- El botón #42 carga los módulos asignados al profesor autenticado, dado que un módulo puede tener varios proyectos. El profesor debe seleccionar primero su módulo para ver y gestionar los proyectos que le corresponden.

### Pantalla Corregir Proyecto — flujo de carga (#65–#69)

- Los filtros #65 (año), #66 (ciclo) y #67 (módulo) acotan las opciones disponibles.
- El filtro #67 muestra únicamente los módulos asignados al profesor autenticado (no todos los módulos del ciclo).
- La tabla de corrección #69 se carga únicamente después de que el usuario ha aplicado los tres filtros y ha seleccionado un proyecto en el desplegable #68.

### Pantalla Corregir Proyecto — checkboxes de alumno (#77–#80)

- Los checkboxes #77 (Corregir por grupo) y #78–#80 (Alumno 1, 2, 3) forman un grupo de selección exclusiva:
  - Si se marca #77, se desmarcan #78, #79 y #80. La puntuación de cada ítem se asigna a **todos los alumnos del proyecto**.
  - Si se marca cualquiera de #78, #79 o #80, se desmarca #77 y los demás checkboxes de alumno individual. Solo se puede seleccionar **un alumno individual a la vez**. La puntuación de cada ítem se asigna únicamente a ese alumno.
