# Especificación Funcional

Especificación funcional estructurada: 90 elementos con `behavior`, `businessRules` y
`acceptanceCriteria` por sketchNumber, generada por el **Agente 4 — Generador Func. Spec**.

## Estado

!!! warning "Pendiente de generar"
    Ejecuta el **Agente 4 — Generador Func. Spec** (`/generate-functional-spec`) para
    poblar esta especificación.

    **Prerrequisitos:**

    1. `/boceto-parser` — genera `boceto-metadata.json` + `boceto-elements.md`
    2. `/designer-front` — genera `ui-spec.json`
    3. `/business-analyst` — completa `transcripcion.md`
    4. `/alignment-validator` — produce `alignment-report.json { valid: true }`
    5. `/generate-functional-spec` — **este paso**

## Estructura del artefacto

Una vez generado, `functional-spec.json` tiene esta forma:

```json
{
  "elementSpecs": [
    {
      "sketchNumber": 1,
      "behavior": "Campo de texto para introducir el nombre de usuario...",
      "businessRules": [
        "El usuario debe existir en la base de datos",
        "Distingue mayúsculas/minúsculas"
      ],
      "acceptanceCriteria": [
        "Cuando el usuario introduce credenciales válidas, redirige a /admin o /profesor",
        "Cuando el usuario introduce credenciales inválidas, muestra mensaje de error"
      ]
    }
  ],
  "globalRules": [
    "Los identificadores de alumno son siempre anónimos (ej. JJ499)",
    "Todos los filtros de lista son reactivos — filtran mientras el usuario escribe"
  ]
}
```

## Cobertura esperada

| Pantalla | sketchNumbers | Elementos |
|----------|--------------|-----------|
| Login | #1–#5 | 5 |
| Admin — Legislación | #6–#10, #81–#84 | 9 |
| Admin — Ciclos | #11–#15 | 5 |
| Admin — Módulos | #16–#22 | 7 |
| Admin — Profesorado | #23–#29 | 7 |
| Profesor — Landing | #30 | 1 |
| Profesor — Alumnos | #31–#41 | 11 |
| Profesor — Proyectos | #42–#51 | 10 |
| Profesor — Rúbrica | #52–#64, #90 | 14 |
| Profesor — Corregir | #65–#80 | 16 |
| Profesor — Ver notas | #85–#89 | 5 |
| **Total** | **#1–#90** | **90** |

## Schema Zod

```ts
const FunctionalSpecSchema = z.object({
  elementSpecs: z.array(z.object({
    sketchNumber:      z.number().int().min(1).max(90),
    behavior:          z.string().min(1),
    businessRules:     z.array(z.string()),
    acceptanceCriteria: z.array(z.string()),
  })),
  globalRules: z.array(z.string()),
});
```

Definición completa en `lib/schemas/functional-spec.schema.ts`.
