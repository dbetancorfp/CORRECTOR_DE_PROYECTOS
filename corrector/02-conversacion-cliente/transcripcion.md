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

### Barra de navegación — Botón Salir (#5)

- Al pulsar "Salir", la sesión se cierra inmediatamente: se destruyen la cookie/token de sesión y el usuario es redirigido a la pantalla de login.
- No se muestra ningún diálogo de confirmación antes de cerrar sesión.

### Login y autenticación - index.html (#1–#3)

- Si el usuario introduce credenciales incorrectas, se muestra el mensaje "Credenciales incorrectas" en la misma pantalla del login.
- Se permiten un máximo de 3 intentos fallidos consecutivos. 
- En el primer acceso (contraseña por defecto `12345678`), en la misma pantalla del login aparecen dos campos de texto adicionales para 
   introducir la nueva contraseña dos veces. Si ambas coinciden, se actualiza la base de datos y se redirige a la landing page 
   correspondiente al rol. Si no coinciden, se muestra un error en la misma pantalla y se repite el proceso.
- Si es un profesor el que intenta autenticarse y realiza el tercer intento fallido se muestra el mensaje "Póngase en contacto con el Administrador" y la cuenta queda bloqueada.
  El desbloqueo de cuenta lo realiza el Administrador.
- Si es el Administrador el que intenta autenticarse y realiza el tercer intento fallido, se muestra el mensaje 
    "Póngase en contacto con el soporte técnico" y la cuenta queda bloqueada. El desbloqueo de cuenta lo realiza el soporte técnico accediendo directamente a la BBDD.

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
- En la tabla #10 cada fila puede ser editada (icono en columna "Editar") o borrada (icono en columna "Borrar"). Si pulsamos el "Icono editar" los campos
    de la fila se podrán editar y el texto del botón "Icono editar" cambia a "Guardar". Tras los cambios, pulsamos "Guardar" y se persistirán los cambios
    en la BBDD y se actualizará la tabla de forma automática.
    En caso de pulsar "Borrar" aparecerá una ventana de aviso de confirmación. Si aceptamos continuar el borrado este se elimina de la BBDD y se
    actualizará la tabla #10 de forma automática. En caso de que tenga dependencias no se podrá borrar hasta que no se
    borren las dependencias, mostrando un mensaje advirtiendo este caso.


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
- En la tabla #20 cada fila puede ser editada (icono en columna "Editar") o borrada (icono en columna "Borrar"). Si pulsamos el "Icono editar" los campos
    de la fila se podrán editar y el texto del botón "Icono editar" cambia a "Guardar". Tras los cambios, pulsamos "Guardar" y se persistirán los cambios
    en la BBDD y se actualizará la tabla de forma automática.
    En caso de pulsar "Borrar" aparecerá una ventana de aviso de confirmación. Si aceptamos continuar el borrado este se elimina de la BBDD y se
    actualizará la tabla #20 de forma automática. En caso de que tenga dependencias no se podrá borrar hasta que no se
    borren las dependencias, mostrando un mensaje advirtiendo este caso.


### Administración — Tab Módulos - vista_admin-tab_modulos_seleccionado.html (#22-#32)

- #22 Tab "Módulos" seleccionado: muestra los elementos para la gestión de módulos.
- Para crear un nuevo módulo introducimos los campos nombre (#23) y horas semanales del módulo (#24) luego seleccionamos legislación (#25), 
    el siguiente filtro "año de inicio" (#26) se rellena automáticamente con el año de inicio del ciclo seleccionado. Tras seleccionar 
    "año de de inicio" el siguiente selecttor mostrará solo los Ciclos (#27) que pertenecen a la legislación y año de inicio seleccionados. 
    Pulsando el botón Guardar (#28) se persiste en la base de datos y se añade automáticamente a la tabla #33 sin necesidad de recargar la página,
    siempre que los filtros #29, #30, #31 Y #32 no lo oculten.
- El formulario de creación de un módulo tiene exactamente cinco campos: nombre, hora semanales, legislación, año de inicio y ciclo.
- La tabla (#33) muestra esos mismos cinco campos más los iconos de Editar (#21) y Borrar (#22).
- En la tabla #33 cada fila puede ser editada (icono en columna "Editar") o borrada (icono en columna "Borrar"). Si pulsamos el "Icono editar" los campos
    de la fila se podrán editar y el texto del botón "Icono editar" cambia a "Guardar". Tras los cambios, pulsamos "Guardar" y se persistirán los cambios
    en la BBDD y se actualizará la tabla de forma automática.
    En caso de pulsar "Borrar" aparecerá una ventana de aviso de confirmación. Si aceptamos continuar el borrado este se elimina de la BBDD y se
    actualizará la tabla #33 de forma automática. En caso de que tenga dependencias no se podrá borrar hasta que no se
    borren las dependencias, mostrando un mensaje advirtiendo este caso.


### Administración — Tab Profesorado -  vista_admin-tab_profesorado_seleccionado.html (#34-#46)

- #34 Tab "Profesorado" seleccionado: muestra los elementos para la gestión de profesorado.
- Para crear un nuevo profesor introducimos los campos "nombre del profesor" (#35), "contraseña" (#36) y luego seleccionamos el "año de inicio" (#37),
    la legislación (#38), el ciclo (#39) y el módulo (#40). Luego pulsamos el botón Guardar (#41) para persistir en la base de datos y se añade automáticamente a la tabla #42 sin necesidad de recargar la página,
    El selector legislación (#38) mostrará únicamente los que tienen el año de inicio coincidente en #37. Tras seleccionar la legislación, 
    el selector de ciclo (#39) mostrará únicamente los ciclos que pertenecen a la legislación seleccionada. Tras seleccionar el ciclo, 
    el selector de módulo (#40) mostrará únicamente los módulos que pertenecen al ciclo seleccionado.
- Hay unos filtros de búsqueda (#42 año inicio, #43 legislación, #44 ciclo, #45 módulo) que permiten acotar los profesores mostrados 
    en la tabla #46. 
    Son filtros de texto libre con filtrado reactivo: conforme el usuario escribe, la tabla se actualiza automáticamente para mostrar solo
    los profesores que coinciden con los criterios de búsqueda.

- La columna Contraseña muestra el valor `12345678` mientras el profesor no haya cambiado su contraseña (indica que el primer acceso está pendiente).
- Una vez que el profesor cambia su contraseña, la columna muestra asteriscos (`********`) en lugar del valor real.

- En la tabla #46 cada fila puede ser editada (icono en columna "Editar") o borrada (icono en columna "Borrar"). Si pulsamos el "Icono editar" los campos
    de la fila se podrán editar y el texto del botón "Icono editar" cambia a "Guardar". Tras los cambios, pulsamos "Guardar" y se persistirán los cambios
    en la BBDD y se actualizará la tabla de forma automática.
    En caso de pulsar "Borrar" aparecerá una ventana de aviso de confirmación. Si aceptamos continuar el borrado este se elimina de la BBDD y se
    actualizará la tabla #46 de forma automática. En caso de que tenga dependencias no se podrá borrar hasta que no se
    borren las dependencias, mostrando un mensaje advirtiendo este caso.

### Profesor — landing - vista_profesor-landing.html (#47)
- La landing page del profesor muestra tres botones: "Gestionar", "Corregir", "Visualizar notas" y "Imprimir notas" (#47).


### Profesor - Landing - Gestionar - Tab Alumnos - vista_profesor_landing-gestionar_tab_Alumnos_seleccionado.html (#48–#60)
- Con el tab Alumnos seleccionado, el profesor puede crear un nuevo alumno.
- Para crear un nuevo el profesor escribirá el nombre del alumno (#48) y seleccionará el año de inicio (#49), 
    la legislación (#50), el ciclo (#51) y el módulo (#52). Tras pulsar el botón Nuevo (#53) se persiste en la base de datos 
    y se añade automáticamente a la tabla #60 sin necesidad de recargar la página, siempre que los filtros #55, #56, #57,
    #58 y #59 no lo oculten.
- Podemos subir un archivo YAML, JSON o CSV con varios alumnos al pulsar (#54). El archivo contiene los campos: `nombre`,
   `año de inicio`, `legislación`, `ciclo` y `módulo`. Los datos se persisten en la base de datos y se añaden automáticamente
    a la tabla #60 sin necesidad de recargar la página, siempre que los filtros #55, #56, #57, #58 y #59 no lo oculten.
- Tenemos unos filtros de búsqueda (#55 año inicio, #56 legislación, #57 ciclo, #58 módulo y #59 nombre) que permiten acotar 
    los alumnos mostrados en la tabla #60. 
    Son filtros de texto libre con filtrado reactivo: conforme el usuario escribe, la tabla se actualiza automáticamente para
    mostrar solo los alumnos que coinciden con los criterios de búsqueda.
- En la tabla #60 cada fila puede ser editada (icono en columna "Editar") o borrada (icono en columna "Borrar"). Si pulsamos el "Icono editar" los campos
    de la fila se podrán editar y el texto del botón "Icono editar" cambia a "Guardar". Tras los cambios, pulsamos "Guardar" y se persistirán los cambios
    en la BBDD y se actualizará la tabla de forma automática.
    En caso de pulsar "Borrar" aparecerá una ventana de aviso de confirmación. Si aceptamos continuar el borrado este se elimina de la BBDD y se
    actualizará la tabla #60 de forma automática. En caso de que tenga dependencias no se podrá borrar hasta que no se
    borren las dependencias, mostrando un mensaje advirtiendo este caso.


### Profesor - Landing - Gestionar - Tab Proyectos - vista_profesor_landing-gestionar_tab_Proyectos_seleccionado.html (#61–#72)
- Con el tab Proyectos seleccionado, el profesor puede crear un nuevo proyecto.
- Para crear un nuevo proyecto el profesor escribirá el nombre del proyecto (#61) y seleccionará el año de inicio (#62), 
    la legislación (#63), el ciclo (#64) y el módulo (#65). Tras pulsar el botón Nuevo (#66) se persiste en la base de datos 
    y se añade automáticamente a la tabla #72 sin necesidad de recargar la página, siempre que los filtros #67, #68, #69,
    #70 y #71 no lo oculten.
- Tenemos unos filtros de búsqueda (#67 nombre del proyecto, #68 año de inicio, #69 legislación, #70 ciclo y #71 módulo) 
    que permiten acotar los proyectos mostrados en la tabla #72. 
    Son filtros de texto libre con filtrado reactivo: conforme el usuario escribe, la tabla se actualiza automáticamente 
    para mostrar solo los proyectos que coinciden con los criterios de búsqueda.
- En la tabla #72 cada fila puede ser editada (icono en columna "Editar") o borrada (icono en columna "Borrar"). Si pulsamos el "Icono editar" los campos
    de la fila se podrán editar y el texto del botón "Icono editar" cambia a "Guardar". Tras los cambios, pulsamos "Guardar" y se persistirán los cambios
    en la BBDD y se actualizará la tabla de forma automática.
    En caso de pulsar "Borrar" aparecerá una ventana de aviso de confirmación. Si aceptamos continuar el borrado este se elimina de la BBDD y se
    actualizará la tabla #72 de forma automática. En caso de que tenga dependencias no se podrá borrar hasta que no se
    borren las dependencias, mostrando un mensaje advirtiendo este caso.

### Profesor - Landing - Gestionar - Tab Asignación Proyecto-Alumno - vista_profesor_landing-gestionar_tab_AsignacionesPytoAlumn_seleccionado.html (#73–#85)
- Con el tab "Asignación Proyecto-Alumno seleccionado, el profesor asignar alumnos a proyectos.
- Por un lado tenemos dos filtros; para filtrar por proyecto y otro para filtrar alumnos.
- Para filtrar por módulo podemos escribir el nombre del proyecto (#73) o seleccionar el año de inicio (#74), la legislación (#75), el ciclo (#76)
    y el módulo (#77). 
- Tras aplicar los filtros de "Filtrar por proyecto", en el agrupamiento #83 se muestran el proyecto que coinciden con los criterios de búsqueda.
- Tras aplicar los filtros de "Filtrar por alumno", en el agrupamiento #84 se muestran los alumnos que coinciden con los criterios de búsqueda.
- Para asignar un alumno a un proyecto, el profesor selecciona los alumnos de #84 y el proyecto de #83 y pulsa el botón "Agregar alumnos". 
    La asignación se persiste en la base de datos y se refleja inmediatamente en la tabla (#85) de asignaciones sin necesidad de recargar la página.
- En la tabla #85 cada fila puede ser editada (icono en columna "Editar") o borrada (icono en columna "Borrar"). Si pulsamos el "Icono editar" los campos
    de la fila se podrán editar y el texto del botón "Icono editar" cambia a "Guardar". Tras los cambios, pulsamos "Guardar" y se persistirán los cambios
    en la BBDD y se actualizará la tabla de forma automática.
    En caso de pulsar "Borrar" aparecerá una ventana de aviso de confirmación. Si aceptamos continuar el borrado este se elimina de la BBDD y se
    actualizará la tabla #85 de forma automática. En caso de que tenga dependencias no se podrá borrar hasta que no se
    borren las dependencias, mostrando un mensaje advirtiendo este caso.

### Profesor - Landing - Gestionar - Tab Rúbrica - vista_profesor_landing-gestionar_tab_Rubrica_seleccionado.html (#86–#100)
- Con el tab Rúbrica seleccionado, el profesor puede crear la rúbrica de un módulo.
- A través del ls filtros de "Filtrar por módulo" (#86 nombre del módulo, #87 año de inicio, #88 legislación, #89 ciclo y #90 módulo) el profesor
    selecciona el módulo que imparte.
- En el agrupamiento "Nuevo item" el profesor edita el item en la tabla (#92) columna "Item" y crea los niveles necesario pulsando
    el botón (#91) y asignado a cada celda editable de nivel la puntuación del nivel. 
    Al pusar el botón "Añadir item" (#91) se persiste en la base de datos y se añade automáticamente a la tabla #100 
    sin necesidad de recargar la página, siempre que los filtros #86, #87, #88, #89 y #90 no lo oculten.
- Se podrá subir una rúbrica en formatos CSV, JSON y YAML con los campos items, niveles y sus puntuaciones.
- En la tabla #100 cada fila puede ser editada (icono en columna "Editar") o borrada (icono en columna "Borrar"). Si pulsamos el "Icono editar" los campos
    de la fila se podrán editar y el texto del botón "Icono editar" cambia a "Guardar". Tras los cambios, pulsamos "Guardar" y se persistirán los cambios
    en la BBDD y se actualizará la tabla de forma automática.
    En caso de pulsar "Borrar" aparecerá una ventana de aviso de confirmación. Si aceptamos continuar el borrado este se elimina de la BBDD y se
    actualizará la tabla #100 de forma automática. En caso de que tenga dependencias no se podrá borrar hasta que no se
    borren las dependencias, mostrando un mensaje advirtiendo este caso.

### Profesor — landing - vista_profesor-landing-ver_notas.html (#114-#119)
- Se disponen de los filtros: año de inicio (#114), legislación (#115), ciclo (#116), módulo (#117) y proyecto (#118) mostrandose en
    la tabla (#119) los resultados de aplicar el filtro. Cuando se aplica el filtro "año de inicio" en el filtro "legislación" solo 
    aparecerán los coincidentes y así sucesivamente con el resto de filtros.
- Al pulsar el botón "Imprimir" (#120) mostrará un pdf con la tabla (#119) para descargar.
