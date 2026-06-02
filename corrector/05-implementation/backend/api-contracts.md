# Contratos API — Corrector de Proyectos

**Feature**: corrector-v1  
**Generado por**: Agente 3 — Arquitecto de Requisitos  
**Fecha**: 2026-06-02  
**Base URL**: `/api/v1`  
**Autenticación**: Cookie de sesión (`session_token`). Todos los endpoints excepto `/auth/login` requieren sesión válida.

---

## Índice de grupos

| Grupo | Endpoints |
|-------|-----------|
| [Auth](#auth) | `POST /auth/login`, `POST /auth/change-password`, `POST /auth/logout` |
| [Legislaciones](#legislaciones) | `GET`, `POST`, `PUT /:id`, `DELETE /:id` |
| [Ciclos](#ciclos) | `GET`, `POST`, `PUT /:id`, `DELETE /:id` |
| [Módulos](#modulos) | `GET`, `POST`, `PUT /:id`, `DELETE /:id` |
| [Profesores](#profesores) | `GET`, `POST`, `PUT /:id`, `DELETE /:id`, `POST /:id/unlock` |
| [Alumnos](#alumnos) | `GET`, `POST`, `PUT /:id`, `DELETE /:id`, `POST /upload` |
| [Proyectos](#proyectos) | `GET`, `POST`, `PUT /:id`, `DELETE /:id` |
| [Rúbrica ítems](#rubrica-items) | `GET /modulos/:id/rubrica`, `POST /rubrica-items`, `PUT /rubrica-items/:id`, `DELETE /rubrica-items/:id`, `POST /modulos/:id/rubrica/upload` |
| [Correcciones](#correcciones) | `GET /proyectos/:id/correcciones`, `POST /correcciones`, `PUT /correcciones/:id` |
| [Notas](#notas) | `GET /notas`, `GET /notas/pdf` |

---

## Auth

### POST /auth/login

**Descripción**: Valida credenciales y crea una sesión. Si la contraseña es la predeterminada `12345678`, no crea sesión sino que devuelve `requires_password_change: true`.  
**Roles permitidos**: `public`  
**Elementos del boceto**: #1, #2, #3

#### Request

- **Body**: `{ username: string, password: string }`

#### Response 200 — login exitoso

```json
{
  "user": {
    "id": "uuid",
    "username": "dbetqui",
    "rol": "profesor"
  },
  "redirect": "/profesor"
}
```

La cookie `session_token` se establece como `HttpOnly; SameSite=Strict`.

#### Response 200 — primer acceso (contraseña predeterminada)

```json
{
  "requires_password_change": true,
  "message": "Debe cambiar su contraseña antes de continuar"
}
```

No se crea sesión en este caso.

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `username` o `password` vacíos |
| 401 | Credenciales incorrectas (`Credenciales incorrectas`) |
| 423 | Cuenta bloqueada (`Póngase en contacto con el Administrador`) |

---

### POST /auth/change-password

**Descripción**: Cambia la contraseña en el flujo de primer acceso. No requiere sesión activa — se identifica al usuario por `username` incluido en el body.  
**Roles permitidos**: `public` (solo en flujo primer acceso)  
**Elementos del boceto**: #2, #3

#### Request

- **Body**: `{ username: string, current_password: string, new_password: string, new_password_confirm: string }`

#### Response 200

```json
{
  "user": {
    "id": "uuid",
    "username": "dbetqui",
    "rol": "profesor"
  },
  "redirect": "/profesor"
}
```

La cookie `session_token` se establece tras cambio exitoso.

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `new_password` y `new_password_confirm` no coinciden |
| 400 | `new_password` es igual a `12345678` |
| 400 | `new_password` tiene menos de 8 caracteres |
| 401 | `current_password` no es `12345678` (flujo no válido) |

---

### POST /auth/logout

**Descripción**: Destruye la sesión del usuario autenticado.  
**Roles permitidos**: `admin`, `profesor`, `tutor`  
**Elementos del boceto**: #5

#### Request

Sin body.

#### Response 200

```json
{ "message": "Sesión cerrada" }
```

La cookie `session_token` se elimina.

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |

---

## Legislaciones

### GET /legislaciones

**Descripción**: Devuelve la lista completa de legislaciones.  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #82

#### Response 200

```json
[
  {
    "id": "uuid",
    "abbreviation": "LOMLOE",
    "start_year": 2021,
    "end_year": 2022
  }
]
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | Rol sin permiso |

---

### POST /legislaciones

**Descripción**: Crea una nueva legislación.  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #7, #8, #9, #10, #81

#### Request

- **Body**: `{ abbreviation: string, start_year: number, end_year: number }`

#### Response 201

```json
{
  "id": "uuid",
  "abbreviation": "LOMLOE",
  "start_year": 2021,
  "end_year": 2022
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `abbreviation` contiene minúsculas, o longitud < 2 o > 10 |
| 400 | `end_year` ≠ `start_year + 1` |
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 409 | `abbreviation` ya existe |

---

### PUT /legislaciones/:id

**Descripción**: Actualiza una legislación existente.  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #83, #10

#### Request

- **Params**: `{ id: uuid }`
- **Body**: `{ abbreviation: string, start_year: number, end_year: number }`

#### Response 200

```json
{
  "id": "uuid",
  "abbreviation": "LOMLOE",
  "start_year": 2021,
  "end_year": 2022
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Validaciones de campos (igual que POST) |
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | Legislación no encontrada |
| 409 | `abbreviation` ya existe en otra legislación |

---

### DELETE /legislaciones/:id

**Descripción**: Elimina una legislación. Bloqueado si tiene ciclos asociados.  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #84

#### Request

- **Params**: `{ id: uuid }`

#### Response 200

```json
{ "message": "Legislación eliminada" }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | Legislación no encontrada |
| 409 | La legislación tiene ciclos asociados |

---

## Ciclos

### GET /ciclos

**Descripción**: Devuelve todos los ciclos, opcionalmente filtrados por legislación.  
**Roles permitidos**: `admin`, `profesor`  
**Elementos del boceto**: #13, #17 (modal módulo), #35 (modal alumno), #46 (modal proyecto)

#### Request

- **Query**: `{ legislacion_id?: uuid }`

#### Response 200

```json
[
  {
    "id": "uuid",
    "name": "Desarrollo de Aplicaciones Web",
    "legislacion_id": "uuid",
    "legislacion_abbreviation": "LOMLOE"
  }
]
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | Rol sin permiso |

---

### POST /ciclos

**Descripción**: Crea un nuevo ciclo.  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #12

#### Request

- **Body**: `{ name: string, legislacion_id: uuid }`

#### Response 201

```json
{
  "id": "uuid",
  "name": "Desarrollo de Aplicaciones Web",
  "legislacion_id": "uuid",
  "legislacion_abbreviation": "LOMLOE"
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `name` vacío o `legislacion_id` no proporcionado |
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | `legislacion_id` no existe |
| 409 | Ya existe un ciclo con ese nombre bajo la misma legislación |

---

### PUT /ciclos/:id

**Descripción**: Actualiza un ciclo existente (edición inline).  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #14

#### Request

- **Params**: `{ id: uuid }`
- **Body**: `{ name: string, legislacion_id: uuid }`

#### Response 200

```json
{
  "id": "uuid",
  "name": "Desarrollo de Aplicaciones Web",
  "legislacion_id": "uuid",
  "legislacion_abbreviation": "LOMLOE"
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Validaciones igual que POST |
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | Ciclo no encontrado |
| 409 | Nombre duplicado bajo la misma legislación |

---

### DELETE /ciclos/:id

**Descripción**: Elimina un ciclo. Bloqueado si tiene módulos asociados.  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #15

#### Request

- **Params**: `{ id: uuid }`

#### Response 200

```json
{ "message": "Ciclo eliminado" }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | Ciclo no encontrado |
| 409 | El ciclo tiene módulos asociados |

---

## Módulos

### GET /modulos

**Descripción**: Devuelve todos los módulos, opcionalmente filtrados por ciclo o por los asignados al profesor autenticado.  
**Roles permitidos**: `admin`, `profesor`  
**Elementos del boceto**: #18, #24 (modal profesor), #42 (selector módulo activo), #53 (filtro rúbrica), #67 (filtro corrección)

#### Request

- **Query**: `{ ciclo_id?: uuid, assigned_to_me?: boolean }`

#### Response 200

```json
[
  {
    "id": "uuid",
    "name": "Desarrollo Web en Entorno Cliente",
    "abbreviation": "DEW",
    "ciclo_id": "uuid",
    "ciclo_name": "Desarrollo de Aplicaciones Web",
    "legislacion_id": "uuid",
    "legislacion_abbreviation": "LOMLOE",
    "weekly_hours": 8
  }
]
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | Rol sin permiso |

---

### POST /modulos

**Descripción**: Crea un nuevo módulo.  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #17

#### Request

- **Body**: `{ name: string, abbreviation: string, ciclo_id: uuid, weekly_hours: number }`

#### Response 201

```json
{
  "id": "uuid",
  "name": "Desarrollo Web en Entorno Cliente",
  "abbreviation": "DEW",
  "ciclo_id": "uuid",
  "ciclo_name": "Desarrollo de Aplicaciones Web",
  "legislacion_id": "uuid",
  "legislacion_abbreviation": "LOMLOE",
  "weekly_hours": 8
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Campo requerido vacío o `weekly_hours` ≤ 0 |
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | `ciclo_id` no existe |
| 409 | Las siglas ya existen bajo la misma legislación |

---

### PUT /modulos/:id

**Descripción**: Actualiza un módulo existente (edición inline).  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #21

#### Request

- **Params**: `{ id: uuid }`
- **Body**: `{ name: string, abbreviation: string, ciclo_id: uuid, weekly_hours: number }`

#### Response 200

```json
{
  "id": "uuid",
  "name": "Desarrollo Web en Entorno Cliente",
  "abbreviation": "DEW",
  "ciclo_id": "uuid",
  "ciclo_name": "Desarrollo de Aplicaciones Web",
  "legislacion_id": "uuid",
  "legislacion_abbreviation": "LOMLOE",
  "weekly_hours": 8
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Validaciones igual que POST |
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | Módulo no encontrado |
| 409 | Siglas duplicadas bajo la misma legislación |

---

### DELETE /modulos/:id

**Descripción**: Elimina un módulo. Bloqueado si tiene proyectos asociados.  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #22

#### Request

- **Params**: `{ id: uuid }`

#### Response 200

```json
{ "message": "Módulo eliminado" }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | Módulo no encontrado |
| 409 | El módulo tiene proyectos asociados |

---

## Profesores

### GET /profesores

**Descripción**: Devuelve la lista de todos los profesores.  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #25

#### Response 200

```json
[
  {
    "id": "uuid",
    "username": "dbetqui",
    "nombre_completo": "David Betancor",
    "rol": "profesor",
    "ciclos": [
      { "id": "uuid", "name": "Desarrollo de Aplicaciones Web" }
    ],
    "modulos": [
      { "id": "uuid", "abbreviation": "DEW", "name": "Desarrollo Web en Entorno Cliente" }
    ],
    "password_changed": false,
    "locked": false,
    "failed_login_attempts": 0
  }
]
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | Rol sin permiso |

---

### POST /profesores

**Descripción**: Crea un nuevo profesor con contraseña predeterminada `12345678`.  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #24

#### Request

- **Body**: `{ username: string, nombre_completo: string, rol: "profesor" | "tutor", modulo_ids: uuid[] }`

#### Response 201

```json
{
  "id": "uuid",
  "username": "dbetqui",
  "nombre_completo": "David Betancor",
  "rol": "profesor",
  "ciclos": [],
  "modulos": [],
  "password_changed": false,
  "locked": false
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `username` o `nombre_completo` vacíos |
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 409 | `username` ya existe |

---

### PUT /profesores/:id

**Descripción**: Actualiza los datos de un profesor (edición inline). Si el profesor estaba bloqueado, el guardado desbloquea la cuenta y resetea el contador de intentos.  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #28

#### Request

- **Params**: `{ id: uuid }`
- **Body**: `{ username: string, nombre_completo: string, rol: "profesor" | "tutor", modulo_ids: uuid[] }`

#### Response 200

```json
{
  "id": "uuid",
  "username": "dbetqui",
  "nombre_completo": "David Betancor",
  "rol": "profesor",
  "ciclos": [
    { "id": "uuid", "name": "Desarrollo de Aplicaciones Web" }
  ],
  "modulos": [
    { "id": "uuid", "abbreviation": "DEW", "name": "Desarrollo Web en Entorno Cliente" }
  ],
  "password_changed": false,
  "locked": false,
  "failed_login_attempts": 0
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `username` o `nombre_completo` vacíos |
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | Profesor no encontrado |
| 409 | `username` ya existe en otro profesor |

---

### DELETE /profesores/:id

**Descripción**: Elimina un profesor. Bloqueado si tiene módulos asignados o correcciones guardadas.  
**Roles permitidos**: `admin`  
**Elementos del boceto**: #29

#### Request

- **Params**: `{ id: uuid }`

#### Response 200

```json
{ "message": "Profesor eliminado" }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | Profesor no encontrado |
| 409 | El profesor tiene módulos asignados o correcciones guardadas |

---

## Alumnos

### GET /alumnos

**Descripción**: Devuelve la lista de todos los alumnos (códigos anónimos; sin nombre real).  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #36

#### Request

- **Query**: `{ code?: string, ciclo_id?: uuid, legislacion_id?: uuid }`
  — filtros reactivos del frontend; el backend soporta todos opcionales.

#### Response 200

```json
[
  {
    "id": "uuid",
    "code": "JJ499",
    "ciclo_id": "uuid",
    "ciclo_name": "Desarrollo de Aplicaciones Web",
    "legislacion_id": "uuid",
    "legislacion_abbreviation": "LOMLOE"
  }
]
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | Rol sin permiso |

---

### POST /alumnos

**Descripción**: Crea un nuevo alumno. Almacena `code` y `ciclo_id` en `alumnos`; almacena `nombre_completo` en `alumno_nombres`.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #35

#### Request

- **Body**: `{ code: string, ciclo_id: uuid, nombre_completo: string }`

#### Response 201

```json
{
  "id": "uuid",
  "code": "JJ499",
  "ciclo_id": "uuid",
  "ciclo_name": "Desarrollo de Aplicaciones Web",
  "legislacion_id": "uuid",
  "legislacion_abbreviation": "LOMLOE"
}
```

El `nombre_completo` no se incluye en el response.

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `code`, `ciclo_id` o `nombre_completo` vacíos |
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | `ciclo_id` no existe |
| 409 | `code` ya existe |

---

### PUT /alumnos/:id

**Descripción**: Actualiza los datos de un alumno (edición inline). El `nombre_completo` se actualiza en `alumno_nombres`.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #39

#### Request

- **Params**: `{ id: uuid }`
- **Body**: `{ code: string, ciclo_id: uuid, nombre_completo: string }`

#### Response 200

```json
{
  "id": "uuid",
  "code": "JJ499",
  "ciclo_id": "uuid",
  "ciclo_name": "Desarrollo de Aplicaciones Web",
  "legislacion_id": "uuid",
  "legislacion_abbreviation": "LOMLOE"
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `code`, `ciclo_id` o `nombre_completo` vacíos |
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | Alumno no encontrado |
| 409 | `code` ya existe en otro alumno |

---

### DELETE /alumnos/:id

**Descripción**: Elimina un alumno. Bloqueado si tiene notas o asignaciones a proyectos.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #40

#### Request

- **Params**: `{ id: uuid }`

#### Response 200

```json
{ "message": "Alumno eliminado" }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | Alumno no encontrado |
| 409 | El alumno tiene correcciones o asignaciones a proyectos; response incluye `{ dependencies: { correcciones: number, proyectos: string[] } }` |

---

### POST /alumnos/upload

**Descripción**: Importa alumnos masivamente desde un fichero YAML, CSV o JSON. Las filas válidas se insertan; las inválidas se omiten con un informe de errores.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #41

#### Request

- **Body**: `multipart/form-data` con campo `file` (YAML/CSV/JSON).

#### Response 200

```json
{
  "imported": 23,
  "skipped": 2,
  "errors": [
    {
      "row": 5,
      "code": "MNP001",
      "reason": "Ciclo desconocido en la BD"
    },
    {
      "row": 12,
      "code": "JJ499",
      "reason": "Identificador duplicado"
    }
  ]
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Fichero no parseable (parse error total; nada importado) |
| 400 | Formato de fichero no soportado (extensión incorrecta) |
| 401 | No autenticado |
| 403 | Rol sin permiso |

---

## Proyectos

### GET /proyectos

**Descripción**: Devuelve todos los proyectos del módulo activo, opcionalmente filtrados.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #47, #68

#### Request

- **Query**: `{ modulo_id: uuid, name?: string, anio_academico?: number, legislacion_id?: uuid }`
  — `modulo_id` es obligatorio.

#### Response 200

```json
[
  {
    "id": "uuid",
    "name": "Proyecto Web Full-Stack",
    "modulo_id": "uuid",
    "ciclo_id": "uuid",
    "anio_academico": 2025,
    "alumnos": [
      { "id": "uuid", "code": "JJ499" },
      { "id": "uuid", "code": "MNP454" }
    ]
  }
]
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `modulo_id` no proporcionado |
| 401 | No autenticado |
| 403 | Rol sin permiso |

---

### POST /proyectos

**Descripción**: Crea un nuevo proyecto vinculado al módulo activo.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #46

#### Request

- **Body**: `{ name: string, modulo_id: uuid, ciclo_id: uuid, anio_academico: number, alumno_ids: uuid[] }`

#### Response 201

```json
{
  "id": "uuid",
  "name": "Proyecto Web Full-Stack",
  "modulo_id": "uuid",
  "ciclo_id": "uuid",
  "anio_academico": 2025,
  "alumnos": [
    { "id": "uuid", "code": "JJ499" }
  ]
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `alumno_ids` vacío o contiene más de 3 alumnos |
| 400 | Algún alumno ya está asignado a otro proyecto en el mismo año académico |
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | `modulo_id`, `ciclo_id` o algún `alumno_id` no existe |

---

### PUT /proyectos/:id

**Descripción**: Actualiza un proyecto (edición inline). Si se eliminan alumnos con correcciones, el cliente debe haber confirmado previamente y enviar el flag `confirm_delete_correcciones: true`.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #50

#### Request

- **Params**: `{ id: uuid }`
- **Body**: `{ name: string, modulo_id: uuid, ciclo_id: uuid, anio_academico: number, alumno_ids: uuid[], confirm_delete_correcciones?: boolean }`

#### Response 200

```json
{
  "id": "uuid",
  "name": "Proyecto Web Full-Stack",
  "modulo_id": "uuid",
  "ciclo_id": "uuid",
  "anio_academico": 2025,
  "alumnos": [
    { "id": "uuid", "code": "JJ499" }
  ]
}
```

#### Response 409 — alumnos con correcciones a eliminar (pendiente de confirmación)

```json
{
  "requires_confirmation": true,
  "alumnos_with_correcciones": [
    { "id": "uuid", "code": "MNP454" }
  ],
  "message": "Los alumnos listados tienen correcciones guardadas que serán eliminadas si continúa"
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `alumno_ids` vacío o contiene más de 3 alumnos |
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | Proyecto no encontrado |
| 409 | `requires_confirmation: true` — alumnos con correcciones a eliminar sin confirmación |

---

### DELETE /proyectos/:id

**Descripción**: Elimina un proyecto. Bloqueado si tiene correcciones guardadas.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #51

#### Request

- **Params**: `{ id: uuid }`

#### Response 200

```json
{ "message": "Proyecto eliminado" }
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | Rol sin permiso |
| 404 | Proyecto no encontrado |
| 409 | El proyecto tiene correcciones guardadas |

---

## Rúbrica Ítems

### GET /modulos/:id/rubrica

**Descripción**: Devuelve todos los ítems de la rúbrica de un módulo, con el estado de congelación.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #53, #56

#### Request

- **Params**: `{ id: uuid }`  — id del módulo

#### Response 200

```json
{
  "modulo_id": "uuid",
  "frozen": false,
  "excelente_sum": 10.00,
  "is_valid": true,
  "items": [
    {
      "id": "uuid",
      "name": "Funcionalidad",
      "excelente": 4.00,
      "muy_bien": 3.00,
      "bien": 2.00,
      "regular": 1.00,
      "mal": 0.00,
      "orden": 1
    }
  ]
}
```

- `frozen: true` significa que existen correcciones para este módulo; todos los campos son de solo lectura.
- `is_valid: true` significa que `excelente_sum === 10.00`.

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | El módulo no está asignado al profesor autenticado |
| 404 | Módulo no encontrado |

---

### POST /rubrica-items

**Descripción**: Añade un nuevo ítem a la rúbrica de un módulo. Bloqueado si la rúbrica está congelada.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #55, #57, #58, #59, #60, #61

#### Request

- **Body**: `{ modulo_id: uuid, name: string, excelente: number, muy_bien: number, bien: number, regular: number, orden?: number }`

#### Response 201

```json
{
  "id": "uuid",
  "modulo_id": "uuid",
  "name": "Funcionalidad",
  "excelente": 4.00,
  "muy_bien": 3.00,
  "bien": 2.00,
  "regular": 1.00,
  "mal": 0.00,
  "orden": 1
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `name` vacío |
| 400 | Orden de valores incorrecto (no cumple `excelente > muy_bien > bien > regular > 0`) |
| 401 | No autenticado |
| 403 | El módulo no está asignado al profesor autenticado, o la rúbrica está congelada |
| 404 | `modulo_id` no encontrado |

---

### PUT /rubrica-items/:id

**Descripción**: Actualiza un ítem de rúbrica (auto-guardado en blur). Bloqueado si la rúbrica está congelada.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #57, #58, #59, #60, #61

#### Request

- **Params**: `{ id: uuid }`
- **Body**: `{ name?: string, excelente?: number, muy_bien?: number, bien?: number, regular?: number, orden?: number }`

#### Response 200

```json
{
  "id": "uuid",
  "modulo_id": "uuid",
  "name": "Funcionalidad",
  "excelente": 4.00,
  "muy_bien": 3.00,
  "bien": 2.00,
  "regular": 1.00,
  "mal": 0.00,
  "orden": 1,
  "new_excelente_sum": 10.00,
  "is_valid": true
}
```

`new_excelente_sum` e `is_valid` se incluyen siempre para que el frontend actualice #64 sin necesidad de un request adicional.

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `name` vacío o valor numérico inválido |
| 400 | Orden de valores incorrecto |
| 401 | No autenticado |
| 403 | Rúbrica congelada o módulo no asignado al profesor |
| 404 | Ítem no encontrado |

---

### DELETE /rubrica-items/:id

**Descripción**: Elimina un ítem de rúbrica. Bloqueado si la rúbrica está congelada.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #90

#### Request

- **Params**: `{ id: uuid }`

#### Response 200

```json
{
  "message": "Ítem eliminado",
  "new_excelente_sum": 6.00,
  "is_valid": false
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | Rúbrica congelada o módulo no asignado al profesor |
| 404 | Ítem no encontrado |

---

### POST /modulos/:id/rubrica/upload

**Descripción**: Reemplaza la rúbrica completa de un módulo desde fichero YAML/CSV/JSON. Bloqueado si la rúbrica está congelada.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #63

#### Request

- **Params**: `{ id: uuid }`  — id del módulo
- **Body**: `multipart/form-data` con campo `file` (YAML/CSV/JSON).

#### Response 200

```json
{
  "items": [ /* lista completa de ítems importados */ ],
  "excelente_sum": 10.00,
  "is_valid": true
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Fichero no parseable o formato no soportado |
| 401 | No autenticado |
| 403 | Rúbrica congelada o módulo no asignado al profesor |
| 404 | Módulo no encontrado |

---

## Correcciones

### GET /proyectos/:id/correcciones

**Descripción**: Devuelve todas las correcciones de un proyecto, organizadas por alumno.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #69, #71–#76

#### Request

- **Params**: `{ id: uuid }`  — id del proyecto
- **Query**: `{ alumno_id?: uuid }`  — filtra por alumno concreto (alumno individual activo)

#### Response 200

```json
{
  "proyecto_id": "uuid",
  "alumnos": [
    {
      "alumno_id": "uuid",
      "code": "JJ499",
      "nombre_completo": "Nombre Real Aquí",
      "correcciones": [
        {
          "rubrica_item_id": "uuid",
          "item_name": "Funcionalidad",
          "nivel_seleccionado": "excelente",
          "puntuacion": 4.00
        }
      ],
      "total": 8.00,
      "is_complete": false
    }
  ]
}
```

`nombre_completo` se incluye en este endpoint porque el frontend de corrección necesita mostrar nombres reales en las etiquetas de los checkboxes (#78–#80).

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |
| 403 | El módulo del proyecto no está asignado al profesor |
| 404 | Proyecto no encontrado |

---

### POST /correcciones

**Descripción**: Crea o actualiza una corrección (auto-guardado en click). Si ya existe una corrección para la combinación `alumno_id + proyecto_id + rubrica_item_id`, hace UPSERT.  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #71, #72, #73, #74, #75

#### Request

- **Body**: `{ alumno_id: uuid | "group", proyecto_id: uuid, rubrica_item_id: uuid, nivel_seleccionado: "excelente" | "muy_bien" | "bien" | "regular" | "mal" }`
  
  Cuando `alumno_id === "group"`, el backend expande el guardado a todos los alumnos del proyecto.

#### Response 200

```json
{
  "saved": [
    {
      "alumno_id": "uuid",
      "rubrica_item_id": "uuid",
      "nivel_seleccionado": "excelente",
      "puntuacion": 4.00
    }
  ]
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `nivel_seleccionado` no es un valor válido del enum |
| 400 | `alumno_id` no pertenece al proyecto |
| 401 | No autenticado |
| 403 | El módulo del proyecto no está asignado al profesor |
| 403 | La rúbrica del módulo es inválida (suma Excelente ≠ 10.00) |
| 404 | Proyecto, alumno o ítem de rúbrica no encontrado |

---

### PUT /correcciones/:id

**Descripción**: Actualiza una corrección existente (re-corrección sin confirmación).  
**Roles permitidos**: `profesor`  
**Elementos del boceto**: #71–#75

#### Request

- **Params**: `{ id: uuid }`
- **Body**: `{ nivel_seleccionado: "excelente" | "muy_bien" | "bien" | "regular" | "mal" }`

#### Response 200

```json
{
  "id": "uuid",
  "alumno_id": "uuid",
  "rubrica_item_id": "uuid",
  "nivel_seleccionado": "bien",
  "puntuacion": 2.00
}
```

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | `nivel_seleccionado` inválido |
| 401 | No autenticado |
| 403 | Corrección no pertenece al profesor autenticado |
| 404 | Corrección no encontrada |

---

## Notas

### GET /notas

**Descripción**: Devuelve los datos del informe de notas para los tres filtros en cascada. Usado por la previsualización #89.  
**Roles permitidos**: `profesor`, `tutor`  
**Elementos del boceto**: #85, #86, #87, #89

#### Request

- **Query**: `{ anio_academico: number, ciclo_id: uuid, modulo_id: uuid }`

#### Response 200

```json
{
  "filters": {
    "anio_academico": 2025,
    "ciclo_name": "Desarrollo de Aplicaciones Web",
    "modulo_name": "Desarrollo Web en Entorno Cliente"
  },
  "pending_modules": [
    { "id": "uuid", "name": "Desarrollo Web en Entorno Servidor", "abbreviation": "DEW-S" }
  ],
  "rows": [
    {
      "proyecto_name": "Proyecto Web Full-Stack",
      "alumno_code": "JJ499",
      "nombre_completo": "Nombre Real",
      "niveles_evaluados": {
        "excelente": 3,
        "muy_bien": 1,
        "bien": 1,
        "regular": 0,
        "mal": 0
      },
      "nota_final": 8.75,
      "is_complete": true
    }
  ]
}
```

`pending_modules` es un array vacío si todos los módulos del ciclo tienen correcciones.

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Alguno de los tres filtros falta en la query |
| 401 | No autenticado |
| 403 | El módulo no está asignado al profesor autenticado |

---

### GET /notas/pdf

**Descripción**: Genera y devuelve el informe de notas como fichero PDF descargable. Mismos filtros que `GET /notas`.  
**Roles permitidos**: `profesor`, `tutor`  
**Elementos del boceto**: #88

#### Request

- **Query**: `{ anio_academico: number, ciclo_id: uuid, modulo_id: uuid }`

#### Response 200

```
Content-Type: application/pdf
Content-Disposition: attachment; filename="notas_DEW_2025.pdf"
```

El cuerpo es el binario del PDF. Contiene:
- Cabecera con `anio_academico`, `ciclo_name`, `modulo_name`.
- Tabla con columnas: Proyecto, Nombre alumno, Niveles evaluados, Nota final.
- Nota al pie si `pending_modules` no es vacío, listando los módulos sin corregir.

#### Errores

| Código | Condición |
|--------|-----------|
| 400 | Alguno de los tres filtros falta |
| 401 | No autenticado |
| 403 | El módulo no está asignado al profesor autenticado |

---

## Endpoints auxiliares

### GET /anios-academicos

**Descripción**: Devuelve los valores `año_académico` distintos de todos los proyectos existentes. Usado para poblar el select #85.  
**Roles permitidos**: `profesor`, `tutor`  
**Elementos del boceto**: #85

#### Response 200

```json
[2025, 2024, 2023]
```

#### Errores

| Código | Condición |
|--------|-----------|
| 401 | No autenticado |

---

## Tabla de referencias cruzadas: sketchNumber ↔ endpoint

| sketchNumber | Endpoint principal |
|---|---|
| #1, #2, #3 | `POST /auth/login`, `POST /auth/change-password` |
| #5 | `POST /auth/logout` |
| #6–#10, #81–#84 | `GET/POST/PUT/DELETE /legislaciones` |
| #11–#15 | `GET/POST/PUT/DELETE /ciclos` |
| #16–#22 | `GET/POST/PUT/DELETE /modulos` |
| #23–#29 | `GET/POST/PUT/DELETE /profesores` |
| #30, #85–#89 | `GET /notas`, `GET /notas/pdf`, `GET /anios-academicos` |
| #31–#41 | `GET/POST/PUT/DELETE /alumnos`, `POST /alumnos/upload` |
| #42–#51 | `GET/POST/PUT/DELETE /proyectos` |
| #52–#64, #90 | `GET /modulos/:id/rubrica`, `POST/PUT/DELETE /rubrica-items`, `POST /modulos/:id/rubrica/upload` |
| #65–#80 | `GET /proyectos/:id/correcciones`, `POST /correcciones`, `PUT /correcciones/:id` |
