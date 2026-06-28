# Casos de Uso

10 flujos funcionales (UC-01 a UC-10) derivados del functional-spec, generados por el
**Agente 5 — Arquitecto de Requisitos**.

## Estado

!!! success "Generado — 2026-06-28"
    **Agente 5 — Arquitecto de Requisitos** ejecutado correctamente.

    - `use-cases.md` — 11 casos de uso (UC-01 a UC-10 + UC-07b) · 122 elementos cubiertos
    - `api-contracts.md` — 41 endpoints · 12 grupos
    - Ruta: `corrector/04-use-cases/use-cases.md` · `corrector/05-implementation/backend/api-contracts.md`

## Índice de casos de uso

| ID | Flujo | Elementos del boceto | Actor |
|----|-------|---------------------|-------|
| UC-01 | Login, logout y gestión de sesión | #1–#3, #11 | Todos |
| UC-02 | Gestión de Legislaciones | #4–#10 | Admin |
| UC-03 | Gestión de Ciclos | #12–#21 | Admin |
| UC-04 | Gestión de Módulos | #22–#33 | Admin |
| UC-05 | Gestión de Profesorado | #34–#46 | Admin |
| UC-06 | Gestión de Alumnos | #48–#60 | Profesor |
| UC-07 | Gestión de Proyectos | #61–#72 | Profesor |
| UC-07b | Asignación Proyecto-Alumno | #73–#85, #121 | Profesor |
| UC-08 | Gestión de Rúbrica | #86–#100 | Profesor |
| UC-09 | Corrección de Proyecto | #101–#113 | Profesor |
| UC-10 | Visualización e impresión de Notas | #47, #114–#120, #122 | Profesor / Tutor |

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
