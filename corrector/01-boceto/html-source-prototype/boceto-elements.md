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
| 4 | Logo | imagen | Logo de la aplicación en la barra de navegación |
| 5 | Barra de navegación | nav | Header superior con logo, título, nombre de usuario y botón Salir |
| 6 | Grupo de tabs de Gestión | contenedor | Tabs que permiten cambiar entre Legislación, Ciclos, Módulos y Profesorado |
| 7 | Campo Siglas legislación | input texto | Abreviatura de la legislación (ej. LOMLOE) |
| 8 | Campo año de inicio | input texto | Año de entrada en vigor de la legislación |
| 9 | Campo año de finalización | input texto | Año en que deja de estar vigente la legislación |
| 10 | Botón Guardar | botón submit | Persiste la nueva legislación introducida en los campos 7, 8 y 9 |
| 81 | Botón Nuevo | botón | Abre el formulario para crear una nueva legislación (campos 7, 8 y 9) |
| 82 | Tabla de legislaciones | tabla | Lista todas las legislaciones existentes con siglas, año inicio, año fin y acciones |
| 83 | Icono Editar (legislación) | celda | Acción para editar la legislación de esa fila |
| 84 | Icono Borrar (legislación) | celda | Acción para eliminar la legislación de esa fila |

---

## vista_admin-tab_ciclos_seleccionado.html — Admin · Tab Ciclos

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 11 | Tab Ciclos | botón | Activa la vista de gestión de ciclos (estado seleccionado) |
| 12 | Botón Nuevo | botón | Abre el formulario para crear un nuevo ciclo |
| 13 | Tabla de ciclos | tabla | Lista todos los ciclos existentes con opciones de editar y borrar |
| 14 | Icono Editar (ciclo) | celda | Acción para editar el ciclo de esa fila |
| 15 | Icono Borrar (ciclo) | celda | Acción para eliminar el ciclo de esa fila |

---

## vista_admin-tab_modulos_seleccionado.html — Admin · Tab Módulos

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 16 | Tab Módulos | botón | Activa la vista de gestión de módulos (estado seleccionado) |
| 17 | Botón Nuevo | botón | Abre el formulario para crear un nuevo módulo |
| 18 | Tabla de módulos | tabla | Lista todos los módulos con nombre, siglas, legislación, horas y ciclo |
| 19 | Columna Legislación | cabecera columna | Indica la legislación a la que pertenece el módulo |
| 20 | Columna Ciclo | cabecera columna | Indica el ciclo al que pertenece el módulo |
| 21 | Columna Editar | cabecera columna | Columna de acciones de edición por fila |
| 22 | Columna Borrar | cabecera columna | Columna de acciones de borrado por fila |

---

## vista_admin-tab_profesorado_seleccionado.html — Admin · Tab Profesorado

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 23 | Tab Profesorado | botón | Activa la vista de gestión de profesorado (estado seleccionado) |
| 24 | Botón Nuevo | botón | Abre el formulario para crear un nuevo profesor |
| 25 | Tabla de profesorado | tabla | Lista todos los profesores con nombre, contraseña, ciclo y módulos asignados |
| 26 | Columna Ciclo | cabecera columna | Ciclo asignado al profesor |
| 27 | Columna Módulos | cabecera columna | Lista de módulos (siglas) asignados al profesor |
| 28 | Columna Editar | cabecera columna | Columna de acciones de edición por fila |
| 29 | Columna Borrar | cabecera columna | Columna de acciones de borrado por fila |

---

## vista_profesor-landing.html — Landing Profesor

| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
| 45 | Botón Imprimir notas | botón | Visible exclusivamente para el rol Tutor; accede a la impresión de notas |

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
