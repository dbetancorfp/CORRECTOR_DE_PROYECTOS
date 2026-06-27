# Boceto Change Proposals

Propuestas de cambio generadas por el Agente 2 (Analista de Negocio) tras la sesión de entrevista con el cliente (2026-06-27).

---

### [NUEVO] #121 — Botón "Agregar alumnos" (Asignación Proyecto-Alumno)

- **Pantalla**: `vista_profesor_landing-gestionar_tab_AsignacionesPytoAlumn_seleccionado.html`
- **Tipo**: `button`
- **Ubicación**: entre el panel de proyecto seleccionado (#83) y el panel de alumnos disponibles (#84)
- **Motivo**: el cliente confirmó que el botón existe y es necesario para ejecutar la asignación. Fue omitido por error en la anotación del boceto.
- **Comportamiento esperado**: activo únicamente cuando hay al menos un proyecto seleccionado en el panel #83 y al menos un alumno seleccionado en el panel #84. Al pulsarlo, persiste la asignación en la base de datos y actualiza la tabla #85 sin recargar la página.

---

### [NUEVO] #122 — Labels de estado por módulo (Ver Notas)

- **Pantalla**: `vista_profesor-landing-ver_notas.html`
- **Tipo**: `paragraph` (grupo de badges/labels de solo lectura)
- **Ubicación**: entre los filtros (#114–#118) y la tabla (#119)
- **Motivo**: el cliente confirmó que deben aparecer indicadores visuales que muestren si todos los alumnos de cada módulo ya tienen corrección grabada.
- **Comportamiento esperado**: un label por cada módulo del ciclo seleccionado. Fondo **verde** si todos los alumnos del módulo tienen corrección; fondo **rojo** si falta al menos uno. Visible para el rol Profesor (solo su módulo) y para el rol Tutor (todos los módulos del ciclo). Se actualiza al cambiar el ciclo (#116).

---

### [MODIFICAR] #54 — Subir lista de alumnos (Tab Alumnos)

- **Cambio propuesto**: actualizar los formatos aceptados. El boceto y la especificación técnica actual indican `.csv,.xlsx`; el cliente ha confirmado que los formatos válidos son **CSV, JSON y YAML** (no Excel/XLSX).

---

### [MODIFICAR] #99 — Subir rúbrica (Tab Rúbrica)

- **Cambio propuesto**: actualizar los formatos aceptados. El cliente ha confirmado que los formatos válidos son **CSV, JSON y YAML**.

---

### [MODIFICAR] #15 — Selector "Legislación" en formulario de Ciclos

- **Cambio propuesto**: actualizar la etiqueta o descripción del elemento para dejar claro que es un **filtro de navegación en cascada**, no un campo que se almacena como FK del ciclo. El ciclo no tiene legislación asociada directamente; la legislación se asocia a los módulos. El selector #15 ayuda al usuario a filtrar opciones disponibles pero su valor no se persiste en la tabla `ciclo`.
