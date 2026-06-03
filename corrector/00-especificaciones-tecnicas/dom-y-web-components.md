# JavaScript Avanzado — Día 3
## DOM y Web Components

---

## 1. El árbol DOM

El **Document Object Model (DOM)** es la representación en memoria del documento HTML. Cada elemento, texto o comentario del documento es un nodo de este árbol.

### 1.1 Jerarquía de herencia

Todos los nodos del DOM heredan de una cadena de prototipos bien definida:

```
HTMLHeadingElement
    ↓
HTMLElement
    ↓
Element
    ↓
Node          ←— Text, Comment también heredan de Node
    ↓
EventTarget
    ↓
Object
    ↓
null
```

Esta jerarquía explica por qué un `<div>` tiene tanto métodos de manipulación de nodos (`appendChild`, `removeChild`) como de escucha de eventos (`addEventListener`).

### 1.2 Namespaces

Al crear elementos con `createElementNS` es necesario especificar el namespace:

```js
// HTML
document.createElementNS('http://www.w3.org/1999/xhtml', 'div')

// SVG
document.createElementNS('http://www.w3.org/2000/svg', 'svg')

// MathML
document.createElementNS('http://www.w3.org/1998/Math/MathML', 'math')
```

> Nombres de elementos personalizados: los nombres con guión (`canarias-calendar`) son reconocidos como **custom elements** por la plataforma. Sin guión se crean como `HTMLUnknownElement`.

---

## 2. Operaciones sobre el DOM

### 2.1 Crear nodos

```js
const div     = document.createElement('div')
const text    = document.createTextNode('Hello World')
const comment = document.createComment('Comentario')
```

### 2.2 Insertar nodos

```js
div.appendChild(text)           // inserta al final
document.body.appendChild(div)

// insertBefore(newNode, referenceNode)
div.insertBefore(newNode, existingChild) // inserta antes del nodo de referencia
```

### 2.3 Actualizar nodos

```js
div.setAttribute('id', 'main')
div.setAttribute('data-id', '123')
div.setAttribute('required', '')  // atributos booleanos: valor vacío, nunca true/false

div.className = 'red bg flex'
div.classList.add('active')
div.style.setProperty('color', 'blue')

text.data    = 'Nuevo texto'
comment.data = 'Nuevo comentario'
```

### 2.4 Eliminar nodos

```js
div.parentNode.removeChild(div)  // compatible con todos los navegadores
div.remove()                     // más moderno, no compatible con IE11
```

---

## 3. Consulta del árbol

### 3.1 APIs de selección

```js
// APIs legacy (devuelven colecciones "vivas")
document.getElementById('id')           // 1 elemento
document.getElementsByClassName('clase') // HTMLCollection
document.getElementsByTagName('div')    // HTMLCollection
document.getElementsByName('campo')     // NodeList

// APIs modernas (usan selectores CSS)
document.querySelector('.clase > div')  // primer elemento que coincide
document.querySelectorAll('ul > li')    // NodeList estática
```

### 3.2 Navegación por el árbol

```js
div.parentNode          // nodo padre (puede ser Document)
div.parentElement       // elemento padre (null si el padre no es Element)

div.children            // HTMLCollection — sólo elementos
div.childNodes          // NodeList — elementos + textos + comentarios

div.nextElementSibling    // siguiente elemento hermano
div.previousElementSibling // elemento hermano anterior
div.nextSibling           // siguiente nodo hermano (incluye texto)
```

---

## 4. Rendimiento en operaciones DOM

Las operaciones DOM son costosas porque pueden provocar **reflow** (recálculo de layout) y **repaint**. Estrategias para minimizar el impacto:

### 4.1 DocumentFragment

Permite construir un subárbol en memoria y añadirlo al documento en **una sola operación**, evitando múltiples reflows:

```js
const fragment = document.createDocumentFragment()
for (let i = 0; i < 1000; i++) {
    const li = document.createElement('li')
    li.textContent = `Item ${i}`
    fragment.appendChild(li)
}
document.body.appendChild(fragment) // un solo reflow
```

### 4.2 APIs de rendimiento

```js
// Ejecuta el callback antes del próximo repaint
requestAnimationFrame(callback)

// Ejecuta el callback cuando el hilo principal está libre
requestIdleCallback(callback)
```

### 4.3 Intersection Observer

Detecta cuándo un elemento entra o sale del viewport **sin polling**, a coste prácticamente cero:

```js
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // elemento visible
        }
    })
})
observer.observe(element)
```

---

## 5. Web Components

Los Web Components son un conjunto de APIs nativas del navegador que permiten crear **elementos HTML reutilizables y encapsulados**, sin dependencias externas.

Se componen de tres especificaciones:
1. **Custom Elements** — define nuevos elementos HTML.
2. **Shadow DOM** — encapsula estructura, estilos y comportamiento.
3. **HTML Templates** — fragmentos de markup inerte, clonables eficientemente.

### 5.1 Custom Elements

```js
class MyComponent extends HTMLElement {
    constructor() {
        super()
        // Aquí se inicializa el Shadow DOM
    }
}

customElements.define('my-component', MyComponent)
```

> El nombre debe contener **al menos un guión** (`my-component`) para diferenciarlo de los elementos HTML estándar.

### 5.2 Ciclo de vida

| Callback                            | Cuándo se invoca                        |
|-------------------------------------|-----------------------------------------|
| `constructor`                       | Al crear la instancia (`new` o parser HTML) |
| `connectedCallback`                 | Al insertar el elemento en el documento |
| `disconnectedCallback`              | Al eliminar el elemento del documento   |
| `attributeChangedCallback(name, old, new)` | Al cambiar un atributo observado |
| `adoptedCallback`                   | Al mover el elemento a otro documento   |

```js
class MyComponent extends HTMLElement {
    static observedAttributes = ['color', 'size'] // atributos a observar

    connectedCallback() {
        // suscribir eventos, iniciar observadores
    }

    disconnectedCallback() {
        // limpiar listeners, cancelar observadores
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name in this) {
            this[name] = newValue // delega en setter de la propiedad
        }
    }
}
```

### 5.3 Shadow DOM

El Shadow DOM crea un **árbol DOM aislado** dentro del elemento. Los estilos y los selectores del documento principal no penetran en él (y viceversa).

```js
constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'open' })
    // 'open'   → accesible desde fuera vía element.shadowRoot
    // 'closed' → no accesible desde fuera
}
```

### 5.4 Templates

`<template>` es un elemento HTML cuyo contenido es **inerte** (no se renderiza, no ejecuta scripts, no carga recursos) hasta que se clona explícitamente:

```js
const template = document.createElement('template')
template.innerHTML = `<div class="card"><slot></slot></div>`

// Clonar y añadir al Shadow DOM
shadow.appendChild(template.content.cloneNode(true))
```

### 5.5 Constructable Stylesheets

Permiten crear hojas de estilos en JavaScript y compartirlas entre múltiples Shadow DOMs, evitando duplicación:

```js
import styles from './component.css' with { type: 'css' }

constructor() {
    super()
    const shadow = this.attachShadow({ mode: 'open' })
    shadow.adoptedStyleSheets = [styles]
}
```

### 5.6 Slots

Los slots permiten que el **light DOM** (el contenido que escribe el usuario del componente) se proyecte dentro del Shadow DOM:

```html
<!-- Dentro del Shadow DOM del componente -->
<div class="toolbar"><slot name="toolbar"></slot></div>
<div class="content"><slot name="content"></slot></div>

<!-- Uso del componente -->
<my-layout>
    <nav slot="toolbar">...</nav>
    <main slot="content">...</main>
</my-layout>
```

### 5.7 Propiedades privadas con `#`

ES2022 introdujo campos privados nativos en clases, accesibles sólo desde dentro de la propia clase:

```js
class Calendar extends HTMLElement {
    #date
    #disposables = []
    #days = []

    get date()    { return this.#date }
    set date(value) {
        if (value !== this.#date) {
            this.#date = value
        }
    }
}
```

### 5.8 Delegación de eventos y `composedPath`

En lugar de añadir un listener por cada elemento hijo, se añade **uno solo en el padre** y se identifica el origen real con `composedPath()`. Este método devuelve el camino completo del evento, **atravesando los límites del Shadow DOM**:

```js
#handlerClick(ev) {
    const node = ev.composedPath()
        .find(n => n.dataset && 'index' in n.dataset)

    if (node) {
        const { index } = node.dataset
        // procesar
    }
}
```

### 5.9 Patrón de cleanup de listeners

Cada vez que se añade un listener en `connectedCallback` se debe eliminar en `disconnectedCallback` para evitar memory leaks:

```js
export const events = (node, event, cb) => {
    node.addEventListener(event, cb)
    return () => node.removeEventListener(event, cb) // disposable
}

connectedCallback() {
    this.#disposables.push(events(this, 'click', this.#handlerClick))
}

disconnectedCallback() {
    this.#disposables.forEach(d => d())
    this.#disposables = []
}
```

### 5.10 Ejemplo completo: componente Calendar

```js
import styles from './calendar.css' with { type: 'css' }
import { events } from './util.js'

function* getDays() {
    for (let i = 0; i < 31; i++) yield i + 1
}

class Calendar extends HTMLElement {
    static observedAttributes = ['date', 'size']
    #date
    #disposables = []
    #days = [...getDays()]

    constructor() {
        super()
        const shadow = this.attachShadow({ mode: 'open' })
        shadow.adoptedStyleSheets = [styles]
        shadow.appendChild(this.#createDays().content.cloneNode(true))
    }

    #createDays() {
        const template = document.createElement('template')
        this.#days.forEach((day, index) => {
            const div = document.createElement('div')
            div.className = 'day'
            div.setAttribute('data-index', index)
            div.appendChild(document.createTextNode(day))
            template.content.appendChild(div)
        })
        return template
    }

    #handlerClick(ev) {
        const node = ev.composedPath()
            .find(n => n.dataset && 'index' in n.dataset)
        if (node) {
            const day = this.#days[Number(node.dataset.index)]
            console.log(day)
        }
    }

    connectedCallback() {
        this.#disposables.push(events(this, 'click', this.#handlerClick))
    }

    disconnectedCallback() {
        this.#disposables.forEach(d => d())
        this.#disposables = []
    }

    get date()      { return this.#date }
    set date(value) { if (value !== this.#date) this.#date = value }

    attributeChangedCallback(name, _, newValue) {
        if (name in this) this[name] = newValue
    }
}

customElements.define('canarias-calendar', Calendar)
```

---

## Resumen

| Concepto                  | Clave                                                      |
|---------------------------|------------------------------------------------------------|
| Jerarquía DOM             | `HTMLElement → Element → Node → EventTarget`               |
| Namespaces                | HTML, SVG y MathML requieren `createElementNS`             |
| CRUD DOM                  | `createElement`, `appendChild`, `setAttribute`, `remove`   |
| `querySelector`           | Selección por CSS selector, sustituye APIs legacy          |
| `DocumentFragment`        | Operaciones en batch — un solo reflow                      |
| `requestAnimationFrame`   | Sincronizar con el ciclo de repaint                        |
| `IntersectionObserver`    | Detectar visibilidad sin polling                           |
| Custom Elements           | `customElements.define` — nuevos elementos HTML            |
| Ciclo de vida             | `connected`, `disconnected`, `attributeChanged`            |
| Shadow DOM                | Encapsulación de DOM y estilos                             |
| Templates                 | Markup inerte y clonable                                   |
| Constructable Stylesheets | `adoptedStyleSheets` — estilos compartidos                 |
| Slots                     | Proyección de light DOM en Shadow DOM                      |
| Campos privados `#`       | Encapsulación nativa en clases ES2022                      |
| `composedPath()`          | Delegación de eventos cruzando Shadow DOM                  |
| Disposables               | Patrón de cleanup para evitar memory leaks                 |
