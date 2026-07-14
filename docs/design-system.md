# Sistema de diseño

Fuente única de verdad para la apariencia visual de todos los componentes
`corrector-*`. El Agente 1 (Diseñador Front) asigna `props.variant`/
`props.size` en `ui-spec.json` según esta tabla; el Agente 7 (Implementador)
traduce esos valores a clases Tailwind llamando **siempre** a
`classesFor(type, variant, size)` (`corrector/05-implementation/frontend/src/styles/classes-for.ts`)
— nunca con lógica de mapeo `if variant === '...'` repetida en cada
componente (repetiría el problema de duplicación de SonarCloud que costó
varias rondas arreglar, ver memoria `sonar-duplication-refactor`).

## Paleta

| Rol | Tailwind | Uso |
|-----|----------|-----|
| Primary | `blue-600` / `blue-700` (hover) | Botones de acción principal, tabs activos, foco de inputs |
| Neutral | `gray-50`…`gray-900` | Fondos, bordes, texto |
| Danger | `red-600` / `red-700` (hover) | Botones de borrar, estados de error de validación |

Sin más indicaciones de marca — paleta neutra profesional acordada con el
usuario.

## Escala de tamaños (`size`)

| Size | Padding | Texto |
|------|---------|-------|
| `sm` | `px-2 py-1` | `text-sm` |
| `md` (por defecto) | `px-3 py-2` | `text-base` |
| `lg` | `px-4 py-3` | `text-lg` |

## Vocabulario real de `variant` — reutiliza el enum ya existente del schema

**Importante, no obvio**: `lib/schemas/ui-spec.schema.js` ya declaraba
`props.variant` como un enum **cerrado**: `primary | secondary | danger |
ghost | link` (`.catchall(z.unknown())` en `props` solo afecta a campos NO
declarados explícitamente — `variant` sí lo está, así que el catchall no
lo afloja). No se ha tocado el schema — en vez de inventar valores nuevos
(`default`/`error`/`active`/`inactive`), cada tipo reutiliza ese mismo
enum con un significado consistente:

- **Omitir `variant`** = el aspecto por defecto de ese tipo.
- **`"danger"`** = aspecto de error/destructivo (inputs con validación
  fallida, botones de borrar).
- **`"primary"`** = aspecto "activo/seleccionado" en los tipos que lo
  necesitan (tab activo).

## Tabla tipo × variant × size → clases

Cada fila es lo que `classesFor()` devuelve para ese `type`. `variant`/
`size` por defecto se indican entre paréntesis cuando el tipo los admite.

| `type` | `variant` | clases base (antes de aplicar `size`) |
|--------|-----------|----------------------------------------|
| `button` | `primary` (por defecto, u omitido) | `bg-primary-600 hover:bg-primary-700 text-white rounded font-medium` |
| `button` | `secondary` | `bg-gray-100 hover:bg-gray-200 text-gray-800 rounded font-medium border border-gray-300` |
| `button` | `danger` | `bg-danger-600 hover:bg-danger-700 text-white rounded font-medium` |
| `submit-button` | (igual que `button`, mismas variantes) | — |
| `icon-button` | omitido (por defecto) | `text-gray-500 hover:text-primary-600 rounded p-1` |
| `icon-button` | `danger` | `text-gray-500 hover:text-danger-600 rounded p-1` |
| `tab` | `primary` = tab activo | `border-b-2 border-primary-600 text-primary-700 font-semibold` |
| `tab` | omitido = tab inactivo (por defecto) | `text-gray-500 hover:text-gray-700` |
| `text-input` | omitido (por defecto) | `border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 focus:border-primary-500` |
| `text-input` | `danger` = estado de error | `border border-danger-500 rounded focus:ring-2 focus:ring-danger-500` |
| `password-input` | (igual que `text-input`) | — |
| `number-input` | (igual que `text-input`) | — |
| `select` | (igual que `text-input`, omitido/`danger`) | — |
| `reactive-filter` | (igual que `text-input`/`select` — mismo `<input>`/`<select>` nativo; los filtros no validan, así que siempre se omite `variant`) | — |
| `checkbox` | omitido (única variante) | `rounded border-gray-300 text-primary-600 focus:ring-primary-500` |
| `file-upload` | `secondary` (por defecto) | `text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-primary-50 file:text-primary-700 file:px-3 file:py-1.5 hover:file:bg-primary-100` |
| `table` | omitido (única variante) | `w-full border-collapse` |
| `table-header-cell` | omitido | `bg-gray-50 text-left text-gray-600 font-medium border-b border-gray-200 px-3 py-2` |
| `table-editable-cell` | omitido | `border-b border-gray-100 px-3 py-2` |
| `nav` | omitido | `bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between` |
| `paragraph` | omitido (por defecto) | `text-gray-600` |
| `paragraph` | `danger` | `text-danger-600` |

`size` se aplica añadiendo la clase de padding/texto correspondiente de la
tabla anterior a los tipos que representan controles interactivos
(`button`, `submit-button`, `icon-button`, `text-input`, `password-input`,
`number-input`, `select`, `reactive-filter`, `file-upload`) — `table`,
`table-header-cell`, `table-editable-cell`, `nav`, `paragraph`, `tab`,
`checkbox` no usan `size`.

## Entrega al Shadow DOM

Cada componente usa `attachShadow({mode:'open'})`, así que Tailwind
compilado en `index.html` nunca llega al shadow root — hace falta
`shadowRoot.adoptedStyleSheets`. `src/styles/shadow-styles.ts` expone
`attachSharedStyles(shadowRoot)`, que construye **una** `CSSStyleSheet`
compartida (cacheada a nivel de módulo, cargada de `/dist/tailwind.css`) y
la adopta — cada componente la llama una vez en `connectedCallback`, antes
del primer `_render()`.
