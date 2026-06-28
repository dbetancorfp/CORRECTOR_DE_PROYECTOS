# Especificación Funcional

Especificación funcional estructurada: 122 elementos con `behavior`, `businessRules` y
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
| Login | #1–#3 | 3 |
| Admin — Legislación | #4–#10 | 7 |
| Admin — Ciclos | #11–#21 | 11 |
| Admin — Módulos | #22–#33 | 12 |
| Admin — Profesorado | #34–#46 | 13 |
| Profesor — Landing | #47 | 1 |
| Profesor — Alumnos | #48–#60 | 13 |
| Profesor — Proyectos | #61–#72 | 12 |
| Profesor — Asignación | #73–#85 + #121 | 14 |
| Profesor — Rúbrica | #86–#100 | 15 |
| Profesor — Corregir | #101–#113 | 13 |
| Profesor — Ver notas | #114–#120 + #122 | 8 |
| **Total** | **#1–#122 (incl. #121, #122)** | **122** |

## Schema Zod

```ts
const FunctionalSpecSchema = z.object({
  elementSpecs: z.array(z.object({
    sketchNumber:      z.number().int().min(1).max(122),
    behavior:          z.string().min(1),
    businessRules:     z.array(z.string()),
    acceptanceCriteria: z.array(z.string()),
  })),
  globalRules: z.array(z.string()),
});
```

Definición completa en `lib/schemas/functional-spec.schema.ts`.
