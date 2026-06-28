# Guía de la aplicación

Referencia funcional: roles, flujo de pantallas y datos del dominio.

## Roles de usuario

<div class="grid cards" markdown>

-   :material-wrench:{ .lg .middle } **Admin**

    ---

    Configuración global del sistema: legislaciones, ciclos, módulos y
    cuentas de profesorado. No gestiona alumnos ni proyectos directamente.

-   :material-school:{ .lg .middle } **Profesor**

    ---

    Gestión de clase: alumnos, proyectos y rúbrica. Puede corregir
    proyectos, visualizar notas e imprimir actas.

-   :material-file-document-outline:{ .lg .middle } **Tutor**

    ---

    Mismo perfil que Profesor, con acceso adicional a **Imprimir panorámica**
    (todas las notas del ciclo). No puede gestionar alumnos/proyectos
    directamente.

</div>

## Flujo de pantallas

Ficheros en `corrector/01-boceto/html-source-prototype/`.

```
login (index.html)
├── Admin → Panel de Gestión (pestañas)
│   ├── Legislación   vista_admin-tab_legislacion_seleccionado.html
│   ├── Ciclos        vista_admin-tab_ciclos_seleccionado.html
│   ├── Módulos       vista_admin-tab_modulos_seleccionado.html
│   └── Profesorado   vista_admin-tab_profesorado_seleccionado.html
│
└── Profesor → Landing   vista_profesor-landing.html
    ├── Gestionar → Panel (pestañas)
    │   ├── Alumnos      vista_profesor_landing-gestionar_tab_Alumnos_seleccionado.html
    │   ├── Proyectos    vista_profesor_landing-gestionar_tab_Proyectos_seleccionado.html
    │   ├── Asignación   vista_profesor_landing-gestionar_tab_AsignacionesPytoAlumn_seleccionado.html
    │   └── Rúbrica      vista_profesor_landing-gestionar_tab_Rubrica_seleccionado.html
    ├── Corregir       vista_profesor_landing-corregirProyecto.html
    ├── Ver notas      vista_profesor-landing-ver_notas.html
    └── Imprimir notas  (Tutor — también puede Ver notas)
```

## Modelo de dominio

| Entidad | Atributos principales | Relaciones |
|---------|----------------------|------------|
| **Legislación** | abreviatura (ej. LOMLOE), año inicio, año fin | — |
| **Ciclo** | nombre (ej. Desarrollo de aplicaciones web) | agrupa Módulos; no lleva Legislación propia |
| **Módulo** | nombre, horas semanales, legislación | pertenece a un Ciclo; tiene una Rúbrica y varios Proyectos |
| **Profesor** | usuario Consejería (ej. dbetqui), nombre completo, contraseña | puede tener Módulos de distintos Ciclos |
| **Alumno** | nombre libre (puede ser código anónimo como `JJ499` o nombre real; el sistema no impone formato) | pertenece a un Ciclo; asignado a un único Proyecto por año académico |
| **Proyecto** | nombre, año académico (año de inicio, ej. 2025) | pertenece a un Módulo; agrupa 1–3 Alumnos |
| **Rúbrica** | ítems con 5 niveles; suma de "Excelente" ≤ 10.00; Mal siempre = 0 | pertenece a un Módulo (una rúbrica por módulo, aplica a todos sus proyectos) |

## Niveles de la rúbrica

Cada ítem de la rúbrica tiene cinco niveles de calificación con valor numérico:

`Excelente` · `Muy bien` · `Bien` · `Regular` · `Mal`

## Notas de implementación

| Característica | Detalle |
|---------------|---------|
| Identificadores de alumno | Texto libre; el profesor decide si usa nombre real o código anónimo (ej. `JJ499`). El sistema no impone formato. |
| Filtros reactivos | Las listas de alumnos, proyectos y rúbrica filtran en tiempo real mientras el usuario escribe. |
| Importar alumnos | Acción "Subir lista de alumnos" (#54) — fichero CSV, JSON o YAML con campos `nombre`, `año de inicio`, `legislación`, `ciclo`, `módulo`. Se persisten en la tabla `student` y se enlazan al módulo vía `student_module`. |
| Importar rúbrica | Acción "Subir rúbrica" — fichero CSV, JSON o YAML. Si ya existe rúbrica para el módulo, la sustituye completamente (previa confirmación). |
| Corrección individual / grupal | En la pantalla de corrección (#106) el profesor puede aplicar la nota a todo el grupo o seleccionar alumnos individualmente (#107–#109). |
