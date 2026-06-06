# JS Avanzado — Especificaciones técnicas

Material de referencia del curso **JavaScript Avanzado**. Fuente de verdad
para los agentes del pipeline que generan código frontend. Ficheros completos en
`corrector/00-especificaciones-tecnicas/`.

## Fundamentos del lenguaje y OOP

Base sólida del lenguaje: ámbito de variables, contexto de ejecución, estructuras de datos
y programación orientada a objetos con prototipos y mixins.

### `var` / `let` / `const`

`var` tiene ámbito de función y sufre hoisting. `let` tiene ámbito de bloque. `const` es
una referencia inmutable — el objeto al que apunta sí puede mutarse.

### `this` y pérdida de ámbito

El valor de `this` depende de cómo se invoca la función, no de dónde se define. Las arrow
functions capturan el `this` léxico y no crean el suyo propio.

```js
// bind — fija this una vez
new Bar(this.write.bind(this))

// arrow — captura léxico
new Bar(() => this.write())
```

### Array funcional

```js
a.filter(v => v % 2 === 0)
a.map(v => v * v)
a.reduce((acc, v) => acc + v)
a.find(v => v > 3)
```

### `class` y prototipos

`class` es azúcar sintáctico sobre el sistema de prototipos. La cadena es:
`instancia → Clase.prototype → Object.prototype → null`.

### Mixins — composición horizontal

```js
const Add = base =>
  class extends base { add() {} }

class Customer extends
  inherit().withMixins(Add, Update, Remove, Get) {}

class User extends
  inherit().withMixins(Get) {}
```

---

## Asincronía, azúcar sintáctico y módulos

Sintaxis moderna ES2015+, modelo de ejecución asíncrona y sistema de módulos nativo.

### Truthy / Falsy

Valores falsy: `0`, `''`, `false`, `null`, `undefined`, `NaN`. Usar siempre `===` y `!==`.

!!! warning
    `[]` y `{}` son **truthy**.

### Rest / Spread / Destructuring

```js
function sum(...values) { ... }

const c = [...a, ...b]
const r = { ...foo, ...bar }

const [a, b, ...rest] = arr
const { id, name } = obj
```

### Closures y disposables

```js
function events(node, event, cb) {
  node.addEventListener(event, cb)
  return () =>
    node.removeEventListener(event, cb)
}

const dispose = events(btn, 'click', fn)
dispose() // cleanup garantizado
```

### Event loop

Call stack → Microtasks (Promises) → Macrotasks (setTimeout). Las microtasks se vacían
completamente antes de procesar el siguiente macrotask.

### Async / Await

```js
async function main(id) {
  try {
    const customer = await getCustomer(id)
    const invoices = await getInvoices(customer.id)
  } catch (err) {
    console.log(err)
  }
}
```

### Módulos ES + import dinámico

```js
// Estático
import { fn } from './module.js'

// Dinámico — lazy loading
const m = await import('./page.js')
m.default()
```

---

## DOM y Web Components

Árbol DOM, APIs nativas de manipulación y los tres pilares de Web Components:
Custom Elements, Shadow DOM y Templates.

### Jerarquía DOM

```
HTMLElement
  ↓ Element
  ↓ Node  ←— Text, Comment
  ↓ EventTarget
  ↓ Object → null
```

### Custom Elements + ciclo de vida

```js
class MyEl extends HTMLElement {
  static observedAttributes = ['color']

  connectedCallback()    { /* setup  */ }
  disconnectedCallback() { /* cleanup */ }
  attributeChangedCallback(name, old, val) {}
}
customElements.define('my-el', MyEl)
```

### Shadow DOM

```js
constructor() {
  super()
  const shadow = this.attachShadow({ mode: 'open' })
  // mode 'open'   → accesible vía .shadowRoot
  // mode 'closed' → no accesible desde fuera
}
```

### Constructable Stylesheets

```js
import styles from './c.css' with { type: 'css' }

constructor() {
  super()
  const shadow = this.attachShadow({ mode: 'open' })
  shadow.adoptedStyleSheets = [styles]
}
```

### Campos privados + patrón disposables

```js
class MyEl extends HTMLElement {
  #disposables = []

  connectedCallback() {
    this.#disposables.push(
      events(this, 'click', this.#onClick)
    )
  }

  disconnectedCallback() {
    this.#disposables.forEach(d => d())
    this.#disposables = []
  }
}
```

### Delegación + `composedPath`

```js
#handlerClick(ev) {
  const node = ev.composedPath()
    .find(n => n.dataset && 'index' in n.dataset)
  if (node) {
    const { index } = node.dataset
  }
}
```

---

## Web Components avanzados y Performance

Arquitectura de componentes desacoplados mediante `CustomEvent` y técnicas de
optimización de rendimiento web.

### CustomEvent — comunicación desacoplada

```js
this.dispatchEvent(new CustomEvent('ns:action', {
  bubbles: true,   // sube por el DOM
  composed: true,  // cruza Shadow DOM
  detail: structuredClone(data)
}))
```

### Arquitectura de capas

| Capa | Responsabilidad |
|------|----------------|
| **Presentacional** | Recibe datos, renderiza, sin lógica de negocio |
| **Contenedor** | Gestiona estado, delega rendering en hijos |
| **Servicio** | Lógica pura, sin dependencia del DOM |

### Core Web Vitals

| Métrica | Qué mide |
|---------|---------|
| **LCP** | Tiempo hasta el elemento más grande visible |
| **INP** | Tiempo de respuesta ante interacciones |
| **CLS** | Desplazamiento acumulado del layout |

### Optimización de imágenes

```html
<!-- Imagen LCP -->
<img src="hero.webp"
     fetchpriority="high"
     loading="eager"
     decoding="async"
     width="1200" height="600">

<!-- Imágenes secundarias -->
<img src="item.webp"
     loading="lazy"
     decoding="async"
     width="400" height="300">
```

### Cache-Control para assets estáticos

```http
# Assets con hash — inmutables
Cache-Control: public, max-age=31536000, immutable

# HTML — siempre revalidar
Cache-Control: no-cache

# API — nunca cachear
Cache-Control: no-store
```

### Formatos de imagen

```html
<picture>
  <source type="image/avif" srcset="...">
  <source type="image/webp" srcset="...">
  <img src="fallback.jpg" ...>
</picture>
```

AVIF ~45–55% mejor que JPEG. WebP ~25–35%. Fallback progresivo con `<picture>`.

---

## Ficheros fuente

Los ficheros markdown completos están en `corrector/00-especificaciones-tecnicas/`
y son la entrada al pipeline RAG:

| Fichero | Contenido |
|---------|-----------|
| [`day-01-fundamentos-y-oop.md`](https://github.com/dbetancorfp/CORRECTOR_DE_PROYECTOS/blob/main/corrector/00-especificaciones-tecnicas/day-01-fundamentos-y-oop.md) | var/let/const · this · bind/call/apply · Array funcional · Set/Map · class · prototipos · mixins |
| [`day-02-asincronia-y-modulos.md`](https://github.com/dbetancorfp/CORRECTOR_DE_PROYECTOS/blob/main/corrector/00-especificaciones-tecnicas/day-02-asincronia-y-modulos.md) | Truthy/falsy · rest/spread · destructuring · closures · generators · event loop · callbacks · promises · async/await · módulos ES |
| [`day-03-dom-y-web-components.md`](https://github.com/dbetancorfp/CORRECTOR_DE_PROYECTOS/blob/main/corrector/00-especificaciones-tecnicas/day-03-dom-y-web-components.md) | DOM · Custom Elements · ciclo de vida · Shadow DOM · Templates · Constructable Stylesheets · slots · campos privados · composedPath · disposables |
| [`day-04-web-components-avanzados-y-performance.md`](https://github.com/dbetancorfp/CORRECTOR_DE_PROYECTOS/blob/main/corrector/00-especificaciones-tecnicas/day-04-web-components-avanzados-y-performance.md) | CustomEvent · arquitectura presentacional/contenedor/servicio · Core Web Vitals · preconnect/preload · font-display · imágenes · HTTP/3 · Cache-Control · Brotli · AVIF/WebP |
