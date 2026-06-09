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
│   ├── Legislación   vista_admin-tab_ciclos_seleccionado.html
│   ├── Ciclos        vista_admin-tab_legislacion_seleccionado.html
│   ├── Módulos       vista_admin-tab_modulos_seleccionado.html
│   └── Profesorado   vista_admin-tab_profesorado_seleccionado.html
│
└── Profesor → Landing   vista_profesor-landing.html
    ├── Gestionar → Panel (pestañas)
    │   ├── Alumnos    vista_profesor_landing-gestionar_tab_Alumnos_seleccionado.html
    │   ├── Proyectos  vista_profesor_landing-gestionar_tab_Proyectos_seleccionado.html
    │   └── Rúbrica    vista_profesor_landing-gestionar_tab_Rubrica_seleccionado.html
    ├── Corregir       vista_profesor_landing-corregirProyecto.html
    ├── Ver notas      vista_profesor-landing-ver_notas.html
    └── Imprimir notas  (Tutor — también puede Ver notas)
```

## Modelo de dominio

| Entidad | Atributos principales | Relaciones |
|---------|----------------------|------------|
| **Legislación** | abreviatura (ej. LOMLOE), año inicio, año fin | — |
| **Ciclo** | nombre (ej. Desarrollo de aplicaciones web) | agrupa Módulos; no lleva Legislación propia |
| **Módulo** | nombre, siglas (ej. DEW, máx. 10 car. mayúsc.), horas semanales, legislación | pertenece a un Ciclo; tiene una Rúbrica y varios Proyectos |
| **Profesor** | usuario Consejería (ej. dbetqui), nombre completo, contraseña | puede tener Módulos de distintos Ciclos |
| **Alumno** | identificador anónimo (ej. JJ499); nombre real en tabla segura separada | pertenece a un Ciclo y Legislación; asignado a un único Proyecto a la vez |
| **Proyecto** | nombre, año académico (año de inicio, ej. 2025) | pertenece a un Módulo; agrupa 1–3 Alumnos |
| **Rúbrica** | ítems con 5 niveles; suma de "Excelente" = exactamente 10.00; Mal siempre = 0 | pertenece a un Módulo (una rúbrica por módulo, aplica a todos sus proyectos) |

## Niveles de la rúbrica

Cada ítem de la rúbrica tiene cinco niveles de calificación con valor numérico:

`Excelente` · `Muy bien` · `Bien` · `Regular` · `Mal`

## Notas de implementación

| Característica | Detalle |
|---------------|---------|
| Identificadores de alumno | Códigos anonimizados (ej. `JJ499`, `MnP454`), no nombres reales. |
| Filtros reactivos | Las listas de alumnos, proyectos y rúbrica filtran en tiempo real mientras el usuario escribe. |
| Importar alumnos | Acción "Subir lista de alumnos" — fichero YAML con campos `nombre_completo`, `identificador`, `ciclo`, `legislación`. Carga el identificador en la tabla principal y el nombre real en la tabla segura. |
| Importar rúbrica | Acción "Subir rúbrica" — fichero YAML. Si ya existe rúbrica para el módulo, la sustituye completamente (previa confirmación). |
| Corrección individual / grupal | En la pantalla de corrección (#77) el profesor puede aplicar la nota a todo el grupo o seleccionar alumnos individualmente (#78–#80). |
