# API Contracts — Corrector de Proyectos

**Feature**: corrector-v1  
**Agente**: 5 — Arquitecto de Requisitos  
**Generado**: 2026-06-28  
**Base path**: `/api`  
**Auth**: cookie de sesión HTTP-only (`session_id`) — creada en login, destruida en logout  
**Content-Type**: `application/json` en todas las rutas salvo upload (multipart/form-data)

---

## Convenciones

- Todos los IDs son enteros (`number`) — claves primarias SERIAL del schema PostgreSQL 16.
- Los campos de contraseña (`password_hash`) **nunca** se devuelven en las respuestas.
- `passwordStatus`: `"default"` (must_change_password = true) / `"changed"` (must_change_password = false).
- `academicYear`: formato `"YYYY-YYYY"` (ej. `"2024-2025"`).
- Los endpoints de filtrado con `?param=` son opcionales y aditivos (AND lógico).
- Todas las rutas con prefijo `/api/*` requieren sesión activa salvo `POST /api/auth/login`.

---

## 1. Autenticación

### POST /api/auth/login

**Descripción**: Valida credenciales y crea sesión  
**Roles permitidos**: público  
**Elementos del boceto**: #1, #2, #3

#### Request

- **Body**: `{ username: string, password: string }`

#### Response 200

```json
{
  "id": 1,
  "username": "dbetqui",
  "role": "profesor",
  "mustChangePassword": false
}
```

*Cabecera de respuesta*: `Set-Cookie: session_id=<token>; HttpOnly; SameSite=Strict`

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | username o password vacíos |
| 401 | Credenciales inválidas (`failed_login_attempts` incrementado) |
| 423 | Cuenta bloqueada (`account_locked = true`) |

---

### POST /api/auth/change-password

**Descripción**: Cambia la contraseña del usuario autenticado (obligatorio en primer acceso)  
**Roles permitidos**: admin, profesor, tutor  
**Elementos del boceto**: #3 (flujo de primer acceso)

#### Request

- **Body**: `{ currentPassword: string, newPassword: string, confirmPassword: string }`

#### Response 200

```json
{ "message": "Password updated successfully" }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | newPassword y confirmPassword no coinciden |
| 400 | newPassword < 8 caracteres |
| 401 | currentPassword incorrecto |

---

### POST /api/auth/logout

**Descripción**: Destruye la sesión activa  
**Roles permitidos**: admin, profesor, tutor  
**Elementos del boceto**: #11

#### Response 200

```json
{ "message": "Logged out" }
```

*Cabecera de respuesta*: `Set-Cookie: session_id=; Max-Age=0`

---

## 2. Legislaciones

### GET /api/legislation

**Descripción**: Lista todas las legislaciones con filtros opcionales  
**Roles permitidos**: admin, profesor, tutor  
**Elementos del boceto**: #8, #9, #10

#### Request

- **Query**: `{ year?: number, name?: string }`

#### Response 200

```json
[
  { "id": 1, "name": "LOMLOE", "startYear": 2020 }
]
```

---

### POST /api/legislation

**Descripción**: Crea una nueva legislación  
**Roles permitidos**: admin  
**Elementos del boceto**: #5, #6, #7

#### Request

- **Body**: `{ name: string, startYear: number }`

#### Response 201

```json
{ "id": 2, "name": "LOE", "startYear": 2006 }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | name vacío o fuera del patrón `^[A-Z]{2,10}$` |
| 400 | startYear fuera del rango 1900–2099 |
| 403 | Rol sin permiso |
| 409 | name ya existe |

---

### PUT /api/legislation/:id

**Descripción**: Edita una legislación existente (inline edit en #10)  
**Roles permitidos**: admin  
**Elementos del boceto**: #10

#### Request

- **Params**: `{ id: number }`
- **Body**: `{ name?: string, startYear?: number }`

#### Response 200

```json
{ "id": 1, "name": "LOMLOE", "startYear": 2020 }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 404 | Legislación no existe |
| 409 | name duplicado |

---

### DELETE /api/legislation/:id

**Descripción**: Elimina una legislación sin módulos dependientes  
**Roles permitidos**: admin  
**Elementos del boceto**: #10

#### Request

- **Params**: `{ id: number }`

#### Response 204 (sin cuerpo)

#### Errores

| Código | Condición |
|--------|-----------|
| 404 | No existe |
| 409 | Tiene módulos asociados — eliminar módulos primero |

---

## 3. Ciclos

### GET /api/cycles

**Descripción**: Lista ciclos con filtros opcionales  
**Roles permitidos**: admin, profesor, tutor  
**Elementos del boceto**: #17, #18, #19, #20

#### Request

- **Query**: `{ name?: string, legislationId?: number, year?: number }`

#### Response 200

```json
[
  { "id": 1, "name": "Desarrollo de Aplicaciones Web" }
]
```

---

### POST /api/cycles

**Descripción**: Crea un ciclo (almacena solo el nombre)  
**Roles permitidos**: admin  
**Elementos del boceto**: #13, #16

#### Request

- **Body**: `{ name: string }`

#### Response 201

```json
{ "id": 2, "name": "Administración de Sistemas Informáticos en Red" }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | name vacío, < 3 o > 100 caracteres |
| 409 | name ya existe |

---

### PUT /api/cycles/:id

**Descripción**: Edita el nombre de un ciclo  
**Roles permitidos**: admin  
**Elementos del boceto**: #20

#### Request

- **Params**: `{ id: number }`
- **Body**: `{ name: string }`

#### Response 200

```json
{ "id": 1, "name": "Desarrollo de Aplicaciones Multiplataforma" }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 404 | Ciclo no existe |
| 409 | name duplicado |

---

### DELETE /api/cycles/:id

**Descripción**: Elimina un ciclo sin módulos asociados  
**Roles permitidos**: admin  
**Elementos del boceto**: #20

#### Response 204 (sin cuerpo)

#### Errores

| Código | Condición |
|--------|-----------|
| 404 | No existe |
| 409 | Tiene módulos asociados |

---

## 4. Módulos

### GET /api/modules

**Descripción**: Lista módulos con filtros opcionales  
**Roles permitidos**: admin, profesor, tutor  
**Elementos del boceto**: #29–#33, #27, #40, #65, #90, #104, #117

#### Request

- **Query**: `{ name?: string, cycleId?: number, legislationId?: number, year?: number, teacherId?: number }`

Cuando `teacherId` se proporciona (solo admin o el propio profesor), filtra a los módulos asignados a ese profesor.

#### Response 200

```json
[
  {
    "id": 1,
    "name": "Desarrollo Web en Entorno Cliente",
    "weeklyHours": 7,
    "cycleId": 1,
    "cycleName": "Desarrollo de Aplicaciones Web",
    "legislationId": 1,
    "legislationName": "LOMLOE"
  }
]
```

---

### POST /api/modules

**Descripción**: Crea un módulo  
**Roles permitidos**: admin  
**Elementos del boceto**: #23–#28

#### Request

- **Body**: `{ name: string, weeklyHours: number, cycleId: number, legislationId: number }`

#### Response 201

```json
{
  "id": 3,
  "name": "Desarrollo Web en Entorno Cliente",
  "weeklyHours": 7,
  "cycleId": 1,
  "legislationId": 1
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Campos requeridos faltantes o weeklyHours fuera de 1–30 |
| 409 | Combinación name+cycleId+legislationId ya existe |

---

### PUT /api/modules/:id

**Descripción**: Edita un módulo  
**Roles permitidos**: admin  
**Elementos del boceto**: #33

#### Request

- **Params**: `{ id: number }`
- **Body**: `{ name?: string, weeklyHours?: number, cycleId?: number, legislationId?: number }`

#### Response 200

```json
{ "id": 1, "name": "DEW", "weeklyHours": 7, "cycleId": 1, "legislationId": 1 }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 404 | No existe |
| 409 | Unicidad violada |

---

### DELETE /api/modules/:id

**Descripción**: Elimina un módulo sin proyectos asociados  
**Roles permitidos**: admin  
**Elementos del boceto**: #33

#### Response 204 (sin cuerpo)

#### Errores

| Código | Condición |
|--------|-----------|
| 409 | Tiene proyectos asociados |

---

## 5. Profesorado

### GET /api/teachers

**Descripción**: Lista profesores con información de módulos asignados  
**Roles permitidos**: admin  
**Elementos del boceto**: #42–#46

#### Request

- **Query**: `{ year?: number, legislationId?: number, cycleId?: number, moduleId?: number }`

#### Response 200

```json
[
  {
    "id": 1,
    "username": "dbetqui",
    "role": "profesor",
    "passwordStatus": "changed",
    "accountLocked": false,
    "failedLoginAttempts": 0,
    "modules": [{ "id": 1, "name": "Desarrollo Web en Entorno Cliente" }]
  }
]
```

---

### POST /api/teachers

**Descripción**: Crea un profesor y lo asigna a un módulo  
**Roles permitidos**: admin  
**Elementos del boceto**: #35–#41

#### Request

- **Body**: `{ username: string, password: string, moduleId: number }`

`role` es siempre `"profesor"` — esta pantalla no permite crear `admin` ni
`tutor` (sin selector de rol en el boceto ni criterio de aceptación que lo
requiera; `must_change_password` se fija a `true` automáticamente).

#### Response 201

```json
{
  "id": 4,
  "username": "mariagon",
  "role": "profesor",
  "passwordStatus": "default",
  "modules": [{ "id": 1, "name": "Desarrollo Web en Entorno Cliente" }]
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Campos requeridos faltantes o password < 8 caracteres |
| 409 | username ya existe |
| 409 | Módulo ya asignado a otro profesor |

---

### PUT /api/teachers/:id

**Descripción**: Edita datos del profesor  
**Roles permitidos**: admin  
**Elementos del boceto**: #46

#### Request

- **Params**: `{ id: number }`
- **Body**: `{ username?: string }`

Solo `username` es editable inline — el repositorio no reasigna `moduleId` en
`update()`; reasignar el módulo de un profesor no tiene criterio de aceptación
en `functional-spec.json` #46 y no está implementado.

#### Response 200

```json
{ "id": 1, "username": "dbetqui", "modules": [{ "id": 1, "name": "DEW" }] }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 404 | No existe |
| 409 | username duplicado |

---

### DELETE /api/teachers/:id

**Descripción**: Elimina un profesor sin correcciones registradas  
**Roles permitidos**: admin  
**Elementos del boceto**: #46

#### Response 204 (sin cuerpo)

#### Errores

| Código | Condición |
|--------|-----------|
| 409 | Tiene correcciones registradas |

---

### POST /api/teachers/:id/unlock

**Descripción**: Desbloquea una cuenta de profesor bloqueada  
**Roles permitidos**: admin  
**Elementos del boceto**: #46

#### Response 200

```json
{ "id": 1, "accountLocked": false, "failedLoginAttempts": 0 }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 404 | No existe |
| 400 | Cuenta no estaba bloqueada |

---

### POST /api/teachers/:id/reset-password

**⚠️ No implementado** — ni la ruta ni un método de servicio existen. Ningún
criterio de aceptación de `functional-spec.json` #46 lo requiere (solo pide
desbloqueo de cuenta, ya cubierto por `POST /:id/unlock`). Documentado aquí
como posible ampliación futura, fuera de alcance de la pantalla actual.

**Descripción**: Restablece la contraseña del profesor a '12345678' y activa must_change_password  
**Roles permitidos**: admin  
**Elementos del boceto**: #46

#### Response 200

```json
{ "id": 1, "passwordStatus": "default" }
```

---

## 6. Alumnos

### GET /api/students

**Descripción**: Lista alumnos con filtros opcionales  
**Roles permitidos**: profesor, tutor  
**Elementos del boceto**: #55–#60

#### Request

- **Query**: `{ name?: string, cycleId?: number, moduleId?: number, legislationId?: number, year?: number }`

#### Response 200

```json
[
  {
    "id": 1,
    "name": "JJ499",
    "cycleId": 1,
    "cycleName": "Desarrollo de Aplicaciones Web",
    "modules": [{ "id": 1, "name": "DEW" }]
  }
]
```

---

### POST /api/students

**Descripción**: Crea un alumno y lo vincula a un módulo  
**Roles permitidos**: profesor  
**Elementos del boceto**: #48–#53

#### Request

- **Body**: `{ name: string, cycleId: number, moduleId: number }`

#### Response 201

```json
{ "id": 5, "name": "MnP454", "cycleId": 1, "modules": [{ "id": 1, "name": "DEW" }] }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | name vacío o cycleId / moduleId faltantes |

---

### PUT /api/students/:id

**Descripción**: Edita datos de un alumno  
**Roles permitidos**: profesor  
**Elementos del boceto**: #60

#### Request

- **Params**: `{ id: number }`
- **Body**: `{ name?: string, cycleId?: number }`

#### Response 200

```json
{ "id": 1, "name": "JJ500", "cycleId": 1 }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 404 | No existe |

---

### DELETE /api/students/:id

**Descripción**: Elimina un alumno no asignado a ningún proyecto  
**Roles permitidos**: profesor  
**Elementos del boceto**: #60

#### Response 204 (sin cuerpo)

#### Errores

| Código | Condición |
|--------|-----------|
| 409 | Alumno asignado a un proyecto |

---

### POST /api/students/upload

**Descripción**: Importación masiva de alumnos desde CSV, JSON o YAML  
**Roles permitidos**: profesor  
**Elementos del boceto**: #54  
**Content-Type**: `multipart/form-data`

#### Request

- **Body**: `file` (campo de formulario) — `.csv`, `.json`, `.yaml` o `.yml`

Formato CSV esperado (cabecera obligatoria):

```
nombre,año_inicio,legislacion,ciclo,modulo
JJ499,2024,LOMLOE,DAW,DEW
```

#### Response 201

```json
{ "created": 15, "errors": [] }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Formato de fichero no soportado |
| 400 | Campo requerido faltante en alguna fila (respuesta incluye `errors[]` con detalles) |
| 422 | Error de validación de datos — ningún registro guardado (transacción completa o ninguna) |

---

## 7. Proyectos

### GET /api/projects

**Descripción**: Lista proyectos con filtros opcionales  
**Roles permitidos**: profesor, tutor  
**Elementos del boceto**: #67–#72

#### Request

- **Query**: `{ name?: string, academicYear?: string, moduleId?: number, cycleId?: number, legislationId?: number }`

#### Response 200

```json
[
  {
    "id": 1,
    "name": "App gestión inventario",
    "academicYear": "2024-2025",
    "moduleId": 1,
    "moduleName": "DEW",
    "cycleName": "DAW",
    "studentCount": 2
  }
]
```

---

### POST /api/projects

**Descripción**: Crea un proyecto  
**Roles permitidos**: profesor  
**Elementos del boceto**: #61–#66

#### Request

- **Body**: `{ name: string, academicYear: string, moduleId: number }`

#### Response 201

```json
{ "id": 3, "name": "App gestión inventario", "academicYear": "2024-2025", "moduleId": 1 }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | name vacío o academicYear con formato incorrecto |

---

### PUT /api/projects/:id

**Descripción**: Edita un proyecto  
**Roles permitidos**: profesor  
**Elementos del boceto**: #72

#### Request

- **Body**: `{ name?: string, academicYear?: string }`

#### Response 200

```json
{ "id": 1, "name": "App inventario v2", "academicYear": "2024-2025" }
```

---

### DELETE /api/projects/:id

**Descripción**: Elimina un proyecto sin alumnos asignados  
**Roles permitidos**: profesor  
**Elementos del boceto**: #72

#### Response 204 (sin cuerpo)

#### Errores

| Código | Condición |
|--------|-----------|
| 409 | Proyecto tiene alumnos asignados |

---

## 8. Asignación Proyecto-Alumno

### GET /api/projects/:id/students

**Descripción**: Lista los alumnos asignados a un proyecto  
**Roles permitidos**: profesor, tutor  
**Elementos del boceto**: #84, #85

#### Request

- **Params**: `{ id: number }` (project id)

#### Response 200

```json
[
  { "studentId": 1, "name": "JJ499" },
  { "studentId": 2, "name": "MnP454" }
]
```

---

### POST /api/projects/:id/students

**Descripción**: Asigna uno o más alumnos a un proyecto  
**Roles permitidos**: profesor  
**Elementos del boceto**: #121

#### Request

- **Params**: `{ id: number }` (project id)
- **Body**: `{ studentIds: number[] }`

#### Response 201

```json
{ "projectId": 1, "assigned": [1, 2], "totalStudents": 2 }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | studentIds vacío |
| 409 | Asignación superaría 3 alumnos en el proyecto |
| 409 | Alumno ya pertenece a otro proyecto en el mismo año académico |

---

### DELETE /api/projects/:projectId/students/:studentId

**Descripción**: Desasigna un alumno de un proyecto  
**Roles permitidos**: profesor  
**Elementos del boceto**: #85

#### Response 204 (sin cuerpo)

#### Errores

| Código | Condición |
|--------|-----------|
| 404 | Asignación no existe |

---

## 9. Rúbrica

### GET /api/modules/:id/rubric

**Descripción**: Obtiene la rúbrica del módulo con todos sus ítems y niveles  
**Roles permitidos**: profesor, tutor  
**Elementos del boceto**: #86, #90, #100

#### Request

- **Params**: `{ id: number }` (module id)
- **Query**: `{ academicYear?: string }`

#### Response 200

```json
{
  "id": 1,
  "moduleId": 1,
  "academicYear": "2024-2025",
  "frozen": false,
  "items": [
    {
      "id": 1,
      "description": "Diseño de la interfaz",
      "displayOrder": 1,
      "levels": [
        { "id": 1, "name": "Excelente", "score": 3.0, "displayOrder": 1 },
        { "id": 2, "name": "Bien",      "score": 2.0, "displayOrder": 2 },
        { "id": 3, "name": "Mal",       "score": 0.0, "displayOrder": 3 }
      ]
    }
  ]
}
```

`frozen: true` cuando existen correcciones para el módulo; la UI bloquea edición/borrado.

#### Errores

| Código | Condición |
|--------|-----------|
| 404 | Módulo no existe o no tiene rúbrica |

---

### POST /api/modules/:id/rubric/items

**Descripción**: Añade un ítem a la rúbrica del módulo  
**Roles permitidos**: profesor  
**Elementos del boceto**: #91–#98

#### Request

- **Params**: `{ id: number }` (module id)
- **Body**:
```json
{
  "academicYear": "2024-2025",
  "description": "Documentación del proyecto",
  "displayOrder": 2,
  "levels": [
    { "name": "Excelente", "score": 2.5, "displayOrder": 1 },
    { "name": "Bien",      "score": 1.5, "displayOrder": 2 },
    { "name": "Mal",       "score": 0.0, "displayOrder": 3 }
  ]
}
```

#### Response 201

```json
{
  "id": 2,
  "rubricId": 1,
  "description": "Documentación del proyecto",
  "displayOrder": 2,
  "levels": [...]
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | description vacío o levels vacío |
| 400 | Nivel Mal con score ≠ 0 |
| 409 | Suma de Excelente superaría 10 |
| 423 | Rúbrica congelada (existen correcciones para el módulo) |

---

### PUT /api/rubric/items/:id

**Descripción**: Edita un ítem de rúbrica (inline edit en #100)  
**Roles permitidos**: profesor  
**Elementos del boceto**: #100

#### Request

- **Params**: `{ id: number }` (rubric_item id)
- **Body**: `{ description?: string, levels?: Array<{ id?: number, name: string, score: number, displayOrder: number }> }`

#### Response 200

```json
{ "id": 1, "description": "Diseño UI actualizado", "levels": [...] }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Nivel Mal con score ≠ 0 |
| 409 | Suma de Excelente superaría 10 |
| 423 | Rúbrica congelada |

---

### DELETE /api/rubric/items/:id

**Descripción**: Elimina un ítem de rúbrica  
**Roles permitidos**: profesor  
**Elementos del boceto**: #97, #100

#### Response 204 (sin cuerpo)

#### Errores

| Código | Condición |
|--------|-----------|
| 423 | Rúbrica congelada |

---

### POST /api/modules/:id/rubric/upload

**Descripción**: Importa o reemplaza la rúbrica de un módulo desde fichero  
**Roles permitidos**: profesor  
**Elementos del boceto**: #99  
**Content-Type**: `multipart/form-data`

#### Request

- **Params**: `{ id: number }` (module id)
- **Query**: `{ academicYear: string, confirm?: boolean }`

Si ya existe rúbrica y `confirm` no es `true`, devuelve 409 con `requiresConfirmation: true`. El cliente reenvía la petición con `confirm=true` para confirmar la sustitución.

#### Response 201

```json
{ "itemsCreated": 5, "levelsCreated": 15 }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Formato no soportado o campos requeridos faltantes |
| 409 | `{ "requiresConfirmation": true, "message": "Ya existe una rúbrica para este módulo" }` |
| 423 | Rúbrica congelada |

---

## 10. Correcciones

### GET /api/corrections

**Descripción**: Obtiene correcciones existentes para un alumno y proyecto  
**Roles permitidos**: profesor  
**Elementos del boceto**: #110, #111 (pre-carga de corrección existente)

#### Request

- **Query**: `{ studentId: number, projectId: number }`

#### Response 200

```json
{
  "id": 1,
  "studentId": 1,
  "moduleId": 1,
  "rubricId": 1,
  "finalScore": 7.50,
  "items": [
    { "rubricItemId": 1, "rubricLevelId": 2 }
  ]
}
```

Devuelve `null` si no existe corrección previa.

---

### POST /api/corrections

**Descripción**: Crea o actualiza (upsert) una corrección completa; calcula y persiste final_score  
**Roles permitidos**: profesor  
**Elementos del boceto**: #110, #111 (auto-save cuando todos los ítems tienen nivel)

#### Request

- **Body**:
```json
{
  "studentId": 1,
  "projectId": 1,
  "moduleId": 1,
  "rubricId": 1,
  "academicYear": "2024-2025",
  "items": [
    { "rubricItemId": 1, "rubricLevelId": 1 },
    { "rubricItemId": 2, "rubricLevelId": 4 }
  ]
}
```

El servidor calcula `final_score = (suma_selected / suma_excelente) × 10`, redondeado a 2 decimales.

#### Response 200 / 201

```json
{
  "id": 1,
  "studentId": 1,
  "moduleId": 1,
  "finalScore": 8.00,
  "items": [
    { "rubricItemId": 1, "rubricLevelId": 1 }
  ]
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | items no cubre todos los ítems de la rúbrica |
| 400 | rubricLevelId no pertenece al rubricItemId indicado |
| 403 | Profesor no es el docente del módulo |

---

## 11. Notas

### GET /api/modules/:id/grades

**Descripción**: Tabla de notas del módulo para el profesor (vista propia)  
**Roles permitidos**: profesor, tutor  
**Elementos del boceto**: #119 (vista profesor)

#### Request

- **Params**: `{ id: number }` (module id)
- **Query**: `{ academicYear: string, projectId?: number }`

#### Response 200

```json
{
  "moduleId": 1,
  "moduleName": "DEW",
  "academicYear": "2024-2025",
  "grades": [
    {
      "projectName": "App inventario",
      "studentName": "JJ499",
      "moduleScore": 7.50
    }
  ]
}
```

Ordenado: por nombre de proyecto ASC, luego por nombre de alumno ASC.

---

### GET /api/cycles/:id/grades

**Descripción**: Tabla panorámica de notas de todos los módulos del ciclo (solo tutor)  
**Roles permitidos**: tutor  
**Elementos del boceto**: #119 (vista tutor), #47

#### Request

- **Params**: `{ id: number }` (cycle id)
- **Query**: `{ academicYear: string }`

#### Response 200

```json
{
  "cycleId": 1,
  "cycleName": "DAW",
  "academicYear": "2024-2025",
  "modules": [
    { "id": 1, "name": "DEW", "weeklyHours": 7 },
    { "id": 2, "name": "DAW", "weeklyHours": 6 }
  ],
  "grades": [
    {
      "projectName": "App inventario",
      "studentName": "JJ499",
      "moduleScores": { "1": 7.50, "2": 6.00 },
      "finalScore": 6.81
    }
  ]
}
```

`finalScore = sum(moduleScore × weeklyHours) / sum(weeklyHours)`, redondeado a 2 decimales, máximo 10.

#### Errores

| Código | Condición |
|--------|-----------|
| 403 | Role no es tutor |

---

### GET /api/projects/:id/grades/pdf

**Descripción**: Genera y devuelve el PDF de notas del proyecto (o panorámica para tutor)  
**Roles permitidos**: profesor, tutor  
**Elementos del boceto**: #120

#### Request

- **Params**: `{ id: number }` (project id)
- **Query**: `{ academicYear: string }`

#### Response 200

- **Content-Type**: `application/pdf`
- **Content-Disposition**: `attachment; filename="notas_<project>_<year>.pdf"`

#### Errores

| Código | Condición |
|--------|-----------|
| 404 | Proyecto no existe |
| 400 | academicYear no proporcionado |

---

## 12. Estado de corrección (badges)

### GET /api/cycles/:id/correction-status

**Descripción**: Estado de corrección por módulo del ciclo (verde/rojo para badges #122)  
**Roles permitidos**: profesor, tutor  
**Elementos del boceto**: #122

#### Request

- **Params**: `{ id: number }` (cycle id)
- **Query**: `{ academicYear: string }`

#### Response 200

```json
{
  "cycleId": 1,
  "academicYear": "2024-2025",
  "modules": [
    {
      "moduleId": 1,
      "moduleName": "DEW",
      "moduleAbbr": "DEW",
      "status": "complete",
      "totalStudents": 5,
      "correctedStudents": 5
    },
    {
      "moduleId": 2,
      "moduleName": "Despliegue de Aplicaciones Web",
      "moduleAbbr": "DAW",
      "status": "incomplete",
      "totalStudents": 5,
      "correctedStudents": 3
    }
  ]
}
```

`status: "complete"` → badge verde; `status: "incomplete"` → badge rojo.

---

## Resumen de endpoints

| Método | Ruta | Roles | Boceto |
|--------|------|-------|--------|
| POST | `/api/auth/login` | público | #1–#3 |
| POST | `/api/auth/change-password` | todos | #3 |
| POST | `/api/auth/logout` | todos | #11 |
| GET | `/api/legislation` | admin,profesor,tutor | #8–#10 |
| POST | `/api/legislation` | admin | #5–#7 |
| PUT | `/api/legislation/:id` | admin | #10 |
| DELETE | `/api/legislation/:id` | admin | #10 |
| GET | `/api/cycles` | admin,profesor,tutor | #17–#20 |
| POST | `/api/cycles` | admin | #13,#16 |
| PUT | `/api/cycles/:id` | admin | #20 |
| DELETE | `/api/cycles/:id` | admin | #20 |
| GET | `/api/modules` | admin,profesor,tutor | #29–#33 |
| POST | `/api/modules` | admin | #23–#28 |
| PUT | `/api/modules/:id` | admin | #33 |
| DELETE | `/api/modules/:id` | admin | #33 |
| GET | `/api/teachers` | admin | #42–#46 |
| POST | `/api/teachers` | admin | #35–#41 |
| PUT | `/api/teachers/:id` | admin | #46 |
| DELETE | `/api/teachers/:id` | admin | #46 |
| POST | `/api/teachers/:id/unlock` | admin | #46 |
| POST | `/api/teachers/:id/reset-password` | admin | #46 |
| GET | `/api/students` | profesor,tutor | #55–#60 |
| POST | `/api/students` | profesor | #48–#53 |
| PUT | `/api/students/:id` | profesor | #60 |
| DELETE | `/api/students/:id` | profesor | #60 |
| POST | `/api/students/upload` | profesor | #54 |
| GET | `/api/projects` | profesor,tutor | #67–#72 |
| POST | `/api/projects` | profesor | #61–#66 |
| PUT | `/api/projects/:id` | profesor | #72 |
| DELETE | `/api/projects/:id` | profesor | #72 |
| GET | `/api/projects/:id/students` | profesor,tutor | #84,#85 |
| POST | `/api/projects/:id/students` | profesor | #121 |
| DELETE | `/api/projects/:pId/students/:sId` | profesor | #85 |
| GET | `/api/modules/:id/rubric` | profesor,tutor | #86,#90,#100 |
| POST | `/api/modules/:id/rubric/items` | profesor | #91–#98 |
| PUT | `/api/rubric/items/:id` | profesor | #100 |
| DELETE | `/api/rubric/items/:id` | profesor | #97,#100 |
| POST | `/api/modules/:id/rubric/upload` | profesor | #99 |
| GET | `/api/corrections` | profesor | #110,#111 |
| POST | `/api/corrections` | profesor | #110,#111 |
| GET | `/api/modules/:id/grades` | profesor,tutor | #119 |
| GET | `/api/cycles/:id/grades` | tutor | #47,#119 |
| GET | `/api/projects/:id/grades/pdf` | profesor,tutor | #120 |
| GET | `/api/cycles/:id/correction-status` | profesor,tutor | #122 |

**Total**: 41 endpoints · 12 grupos · 122 elementos del boceto cubiertos
