# Casos de Uso

10 flujos funcionales (UC-01 a UC-10) derivados del functional-spec, generados por el
**Agente 5 — Arquitecto de Requisitos**.

## Estado

!!! warning "Pendiente de generar"
    Ejecuta el **Agente 5 — Arquitecto de Requisitos** (`/requirement-architect`) para
    poblar esta sección.

    **Prerrequisitos:**

    1. Todos los pasos anteriores completados (Agentes 0–4)
    2. GATE HUMANO aprobado (`reconciliation.json { valid: true }`)
    3. `/requirement-architect` — **este paso**

## Índice de casos de uso

Una vez generado, `use-cases.md` cubrirá estos 10 flujos:

| ID | Flujo | Elementos del boceto |
|----|-------|---------------------|
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

## Formato de cada caso de uso

```markdown
## UC-01: Login y autenticación

**Actor principal**: Profesor / Admin
**Precondiciones**: El usuario no está autenticado.
**Elementos del boceto**: #1 (campo usuario), #2 (campo contraseña), #3 (botón Acceder)

### Flujo principal
1. El usuario accede a la pantalla de login (/).
2. Introduce su nombre de usuario en el campo #1.
3. Introduce su contraseña en el campo #2 (siempre enmascarada).
4. Pulsa el botón Acceder (#3).
5. El sistema valida las credenciales contra la BD.
6. Si son correctas, crea sesión y redirige a /admin o /profesor.

### Flujos alternativos
- **A1**: Credenciales inválidas — muestra mensaje de error, incrementa contador
- **A2**: 3 intentos fallidos — bloquea la cuenta y muestra mensaje de contactar Admin
- **A3**: Contraseña por defecto (12345678) — obliga a cambiar contraseña

### Criterios de aceptación
- [ ] Cuando las credenciales son válidas, usuario redirigido según rol
- [ ] Tras 3 intentos fallidos, cuenta bloqueada
- [ ] Si la contraseña es 12345678, aparecen campos para cambiar contraseña
```

## Artefacto de salida

El Agente 5 produce dos ficheros:

- `corrector/04-use-cases/use-cases.md` — Los 10 casos de uso en formato UML simplificado
- `corrector/05-implementation/backend/api-contracts.md` — Contratos REST por endpoint
