# Entrevista inicial — Diseño de Base de Datos

> **Instrucciones:** El agente `/db-schema-designer` leerá este fichero y te hará preguntas para cubrir todo lo que falte.
> Cuando hayas terminado de escribir, ejecuta: `/db-schema-designer`

---

# Minuta de la Entrevista: Requisitos del Sistema de Gestión Académica y Corrección

He puesto en orden las notas de la entrevista para tener una foto clara de cómo debe comportarse nuestra base de datos. 
Vamos a desgranar el modelo por bloques lógicos con un lenguaje de calle, pero con las restricciones técnicas bien atadas.
---

## 1. El Profesorado, los Administradores y la Tutoría

El núcleo de usuarios del personal se gestiona en una estructura común, pero con sus matices de roles:

- **¿Quién controla el cotarro? (El Admin):** Existe un rol `Admin` que tiene su propia pantalla y permisos para gestionar legislaciones, 
   ciclos, módulos y el alta de profesores. En la base de datos lo meteremos como un valor más de roles
   'admin', 'profesor' y 'tutor', sin hacer uso de ENUM. Importante: un admin nunca va a tutorizar un ciclo ni va a impartir módulos, así que esos campos se 
    quedan en blanco para ellos.

- **Profesores y Módulos:** Un usuario con rol `profesor` es un todoterreno; puede impartir varios módulos y estos pueden pertenecer a ciclos 
    completamente diferentes.

- **El lío de las tutorías (Constraint crítico):** Aquí hay que andar con ojo. Un profesor puede ser tutor de **un único ciclo** 
    (la restricción de unicidad va en el profesor). Por el otro lado, un ciclo puede tener **0 o 1 tutor**, nunca más.

- **Nombres de ciclo únicos por legislación:** El nombre de un ciclo es único dentro de una misma legislación. Es decir, puede existir
    un ciclo "DAW" bajo LOE y otro "DAW" bajo LOMLOE — son registros distintos. Constraint: `UNIQUE(name, legislation_id)` en `cycle`.

- _El flujo de alta:_ El ciclo se crea primero, completamente huérfano (sin tutor). El tutor se le asigna después, al crear o editar el perfil
    del profesor. Además, el sistema no debe permitir realizar correcciones en un ciclo hasta que este tenga un tutor asignado.

- _Relaciones limpias:_ Ojo, no vamos a crear una relación directa entre ciclo y profesor. El vínculo natural del día a día es 
    siempre `Ciclo ➔ Módulo ➔ Profesor` (según los módulos que imparta). La única excepción es el campo de tutoría.

## 2. Los Alumnos y sus Matrículas

Vamos con la gestión de los chavales, que la hemos simplificado bastante para dar flexibilidad al profesor:

- **Identificación sin dolores de cabeza:** No nos vamos a complicar con IDs raros o códigos obligatorios para el alumno. El campo de 
    identificación va a ser simplemente un `nombre` (texto libre). Si el profesor quiere meter el nombre real, adelante; si prefiere usar 
    un código anonimizado (tipo _JJ499_) por privacidad, el sistema no le va a poner trabas ni a validar el formato. No hay tabla de 
    códigos separada.

- **Ciclos y Módulos (Matrícula explícita):** Cada alumno está vinculado formalmente a un Ciclo. Ahora bien, estar en un ciclo 
    no significa ir a por todas: un alumno puede no estar matriculado en todos los módulos de dicho ciclo. Esta matrícula módulo por módulo 
    la gestiona el profesor de forma explícita, así que montaremos una tabla intermedia de inscripción `alumno-módulo`.

- **Nombres de módulo únicos por ciclo:** No puede haber dos módulos con el mismo nombre dentro del mismo ciclo.
    Constraint: `UNIQUE(name, cycle_id)` en `module`.

## 3. Trabajo por Proyectos y el Factor Temporal

El año académico nos va a marcar el histórico de la base de datos:

- **Un proyecto por año:** Los alumnos pertenecen a un proyecto — la entidad `project` no tiene FK directa a `cycle`, ya que el ciclo
    se infiere siempre a través de los alumnos que lo integran (`project_student → student → cycle`). La restricción es que un alumno
    solo puede pertenecer a **un único proyecto por año académico**.

- **Nombres repetidos:** Si en 2025 hay un proyecto llamado "CryptoApp" y en 2026 hacen otro con el mismo nombre, la base de datos debe 
    tratarlos como proyectos totalmente distintos. Aseguraremos esto con una restricción `UNIQUE(alumno_id, año_académico)` en la tabla de
    inscripción al proyecto.

## 4. Las Rúbricas (El motor de evaluación)

Las rúbricas son la herramienta de corrección de los profesores, y quieren que sean muy configurables:

- **Evolución año a año:** Un módulo no tiene una rúbrica fija para siempre. Como los profesores cambian o actualizan su temario, 
    una rúbrica se asocia a un combo de `módulo + año académico`. Clavaremos un `UNIQUE(modulo_id, academic_year)` para que no haya 
    duplicados en el mismo curso escolar.

- **La rúbrica es un recurso del módulo, sin propietario:** La rúbrica no está ligada a ningún profesor concreto; pertenece al módulo.
    No almacenamos `teacher_id` en `rubric`.

- **Estructura de Matriz Dinámica:** Una rúbrica es una matriz de `ítem × nivel` (diseñada a medida por el profesor). 
    Los niveles son variables; un ítem puede tener 3 niveles y otro tener 5. 
    Es más, **cada celda (la intersección de ítem y nivel) tiene su propio valor numérico independiente**. No todos los ítems tienen por qué 
    puntuar igual en el "Nivel 1", por ejemplo.

## 5. El Flujo de Corrección y Notas

¿Cómo se traduce todo esto a la hora de evaluar al alumno?

- **Cada uno lo suyo:** Los profesores de un ciclo corrigen a los alumnos que tienen matriculados. Cada profesor evalúa exclusivamente su módulo.

- **El proceso de votación/puntuación:** Para evaluar, el profesor entra a la rúbrica y **selecciona un nivel para cada ítem**. 
    El sistema hace la magia por detrás: suma los valores de los niveles que ha marcado 
    y **normaliza automáticamente el resultado ponderándolo sobre 10** (que será la nota máxima).

- **Auditoría y Recálculo:** No nos vale con guardar un "un 7.5 en Base de Datos". Tenemos que almacenar en la 
     base de datos el **desglose por ítem de cada corrección** (es decir, qué nivel exacto se le asignó a cada ítem para ese alumno). 
     Así, si el profesor se equivoca en la ponderación o cambia los puntos de la rúbrica, la nota final se puede recalcular en 
     cualquier momento sin perder la información original. Al final, lo que se expone es una 
     foto fija de: `Alumno + Módulo + Nota Final`.

- **Autoría de la corrección:** La corrección debe registrar el `teacher_id` del profesor que la realizó, para mantener la
    trazabilidad de autoría incluso si el profesor cambia de asignación de módulo posteriormente.

---
