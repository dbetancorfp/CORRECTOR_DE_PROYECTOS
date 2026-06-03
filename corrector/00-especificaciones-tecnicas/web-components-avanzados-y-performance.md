# JavaScript Avanzado — Día 4
## Web Components avanzados y Performance web

---

## 1. Comunicación entre Web Components

Uno de los retos más importantes al construir aplicaciones con Web Components es la **comunicación entre componentes desacoplados**. A diferencia de los frameworks donde existe un sistema de estado centralizado o un mecanismo de binding, en la plataforma nativa disponemos de `CustomEvent` como canal de comunicación.

### 1.1 El problema del acoplamiento

La solución ingenua sería obtener una referencia directa al componente destino y llamar a sus métodos:

```js
// Acoplamiento directo — evitar
const carrito = document.querySelector('canarias-carrito')
carrito.addItem(product)
```

Esto crea una dependencia directa entre componentes: si uno cambia, el otro también debe cambiar. Además es imposible si el destino está en un Shadow DOM diferente.

### 1.2 `CustomEvent`: comunicación desacoplada

El patrón correcto es que el componente emisor **publique un evento** con los datos necesarios, y el componente receptor **se suscriba** a ese evento sin conocer al emisor.

```js
// Emisor — sólo conoce el contrato del evento
const event = new CustomEvent('carrito', {
    bubbles: true,   // el evento asciende por el árbol DOM
    composed: true,  // el evento atraviesa los límites del Shadow DOM
    detail: structuredClone(product) // copia profunda — evita mutaciones
})
node.dispatchEvent(event)

// Receptor — sólo conoce el contrato del evento
document.addEventListener('carrito', (ev) => {
    const product = ev.detail
    // procesar
})
```

**Parámetros clave de `CustomEvent`:**

| Parámetro       | Efecto                                         |
|-----------------|------------------------------------------------|
| `bubbles: true` | El evento asciende por el árbol DOM            |
| `composed: true`| El evento traspasa los límites del Shadow DOM  |
| `detail`        | Payload del evento — cualquier valor serializable |

> **`structuredClone`**: se usa en lugar de pasar la referencia directa para garantizar que el receptor trabaja con una copia independiente del objeto. Esto evita que mutaciones en el receptor afecten al estado del emisor.

---

## 2. Arquitectura de la aplicación

### 2.1 Estructura de componentes

La aplicación se organiza en tres capas de responsabilidad bien separadas:

```
canarias-product-list      (contenedor — gestiona lista e interacción)
    └─ canarias-item-product (presentacional — renderiza un producto)

canarias-carrito           (independiente — escucha eventos globales)
```

Los componentes `canarias-product-list` y `canarias-carrito` **no se conocen entre sí**. Se comunican exclusivamente a través del evento `carrito` que viaja por el DOM.

### 2.2 Separación de responsabilidades

- **Componentes presentacionales** (`canarias-item-product`): reciben datos, los renderizan, no tienen lógica de negocio.
- **Componentes contenedores** (`canarias-product-list`): gestionan estado e interacción, delegan rendering en componentes hijos.
- **Clases de servicio** (`Service`): lógica de negocio pura, sin dependencia del DOM.

```js
class Service {
    static getTotal(products) {
        return products.reduce((acc, product) => acc + product.price, 0)
    }
}
```

---

## 3. Implementación de los componentes

### 3.1 Componente presentacional: `canarias-item-product`

Componente sin estado que recibe datos por constructor. Crea su Shadow DOM y renderiza la información del producto:

```js
import styles from './item.css' with { type: 'css' }

export class ProductItem extends HTMLElement {
    #description = ''
    #price = 0

    constructor(description, price) {
        super()
        this.#description = description
        this.#price = price
        const shadow = this.attachShadow({ mode: 'open' })
        shadow.adoptedStyleSheets = [styles]
        shadow.appendChild(this.#getTemplate().content)
    }

    #getTemplate() {
        const template  = document.createElement('template')
        const divDesc   = document.createElement('div')
        const divPrice  = document.createElement('div')
        divDesc.textContent  = this.#description
        divPrice.textContent = this.#price
        template.content.appendChild(divDesc)
        template.content.appendChild(divPrice)
        return template
    }
}

customElements.define('canarias-item-product', ProductItem)
```

### 3.2 Componente contenedor: `canarias-product-list`

Crea los items dinámicamente, gestiona el click mediante delegación de eventos y emite el `CustomEvent`:

```js
import styles from './list.css' with { type: 'css' }
import { ProductItem } from './item.js'

const products = [
    { id: 1, description: 'Artículo 1', price: 1.35 },
    { id: 2, description: 'Artículo 2', price: 1.45 },
    { id: 3, description: 'Artículo 3', price: 1.62 },
]

export class ListProducts extends HTMLElement {
    #disposables = []

    constructor() {
        super()
        const shadow = this.attachShadow({ mode: 'open' })
        shadow.adoptedStyleSheets = [styles]
        shadow.appendChild(this.#getTemplate().content)
    }

    connectedCallback() {
        this.#disposables.push(events(this, 'click', this.#handlerClick))
    }

    disconnectedCallback() {
        this.#disposables.forEach(d => d())
        this.#disposables = []
    }

    #handlerClick(ev) {
        const node = ev.composedPath()
            .find(n => n.dataset && 'id' in n.dataset)
        if (node) {
            const product = products.find(p => p.id === Number(node.dataset.id))
            if (product) {
                ev.stopPropagation()
                node.dispatchEvent(this.#createEvent(product))
            }
        }
    }

    #createEvent(product) {
        return new CustomEvent('carrito', {
            bubbles: true,
            composed: true,
            detail: structuredClone(product)
        })
    }

    #getTemplate() {
        const template = document.createElement('template')
        for (const { id, description, price } of products) {
            const item = new ProductItem(description, price)
            item.setAttribute('data-id', id)
            template.content.appendChild(item)
        }
        return template
    }
}

customElements.define('canarias-product-list', ListProducts)
```

### 3.3 Componente receptor: `canarias-carrito`

Escucha el evento a nivel de `document`, acumula el estado y delega el cálculo en la clase `Service`:

```js
export class Carrito extends HTMLElement {
    #disposables = []
    #items = []
    #div

    constructor() {
        super()
        const shadow = this.attachShadow({ mode: 'open' })
        this.#div = document.createElement('div')
        this.#setTotal(0)
        shadow.appendChild(this.#div)
        this.#suscribeCarritoEvent()
    }

    #suscribeCarritoEvent() {
        this.#disposables.push(
            events(document, 'carrito', this.#handlerCarrito.bind(this))
        )
    }

    #handlerCarrito(ev) {
        this.#items.push(ev.detail)
        ev.stopPropagation()
        this.#setTotal(Service.getTotal(this.#items))
    }

    #setTotal(total) {
        this.#div.textContent = total
    }
}
```

---

## 4. Módulos y punto de entrada

Los componentes se importan en el punto de entrada de la aplicación. El simple hecho de importar el módulo registra el custom element en el registro de la plataforma:

```js
// main.js
import './productos/list.js'
import './carrito/carrito.js'
```

```html
<!-- index.html -->
<script type="module" src="./main.js"></script>
<canarias-product-list></canarias-product-list>
<canarias-carrito></canarias-carrito>
```

---

## 5. Performance web

Una web rápida no es un lujo — es un requisito. Las métricas de rendimiento afectan directamente a la experiencia del usuario y al posicionamiento en buscadores. Las métricas **Core Web Vitals** más relevantes son:

- **LCP (Largest Contentful Paint)**: tiempo hasta que se renderiza el elemento más grande visible.
- **INP (Interaction to Next Paint)**: tiempo de respuesta ante interacciones del usuario.
- **CLS (Cumulative Layout Shift)**: desplazamiento acumulado del layout.

### 5.1 `preconnect`

Establece la conexión TCP/TLS con un origen externo **antes** de que el navegador necesite descargar recursos de ese origen. Elimina la latencia de handshake en el momento crítico.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

> Usar con moderación: cada `preconnect` consume recursos de red. Reservarlo para los orígenes críticos para el LCP (CDN de imágenes, proveedor de fuentes, API principal).

### 5.2 `preload`

Informa al navegador de que un recurso será necesario **en breve** y debe descargarse con alta prioridad, antes de que el parser HTML lo encuentre orgánicamente.

```html
<!-- Precargar la imagen del LCP -->
<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">

<!-- Precargar una fuente -->
<link rel="preload" as="font" href="/fonts/inter.woff2" type="font/woff2" crossorigin>
```

> El atributo `as` es obligatorio: indica al navegador el tipo de recurso para asignar la prioridad correcta y usar la caché adecuada.

### 5.3 Gestión de fuentes: `font-display`

Las fuentes web pueden bloquear el renderizado del texto si no se han descargado. La propiedad `font-display` controla este comportamiento:

| Valor      | Comportamiento                                              |
|------------|-------------------------------------------------------------|
| `auto`     | Comportamiento del navegador (suele ser `block`)            |
| `block`    | Texto invisible hasta que carga la fuente (FOIT)            |
| `swap`     | Muestra fuente del sistema mientras carga, luego intercambia (FOUT) |
| `fallback` | Bloqueo muy corto (100ms), luego fallback, sin intercambio tardío |
| `optional` | El navegador decide si cargar la fuente según la conexión   |

```css
@font-face {
    font-family: 'Inter';
    src: url('/fonts/inter.woff2') format('woff2');
    font-display: swap; /* evita texto invisible durante la carga */
}
```

> Para la mayoría de casos `swap` es la opción más favorable para el LCP: el usuario ve texto desde el primer momento.

### 5.4 Gestión de imágenes

Las imágenes son habitualmente el recurso más pesado de una página. Tres atributos permiten optimizar su carga de forma nativa:

**`loading`**
```html
<!-- Carga inmediata — para imágenes above the fold (LCP) -->
<img src="hero.webp" loading="eager">

<!-- Carga diferida — para imágenes fuera del viewport inicial -->
<img src="producto.webp" loading="lazy">
```

> `loading="lazy"` es la optimización con mejor ratio esfuerzo/beneficio: una sola línea que puede reducir drásticamente el peso inicial de la página.

**`fetchpriority`**
```html
<!-- Alta prioridad — imagen del LCP -->
<img src="hero.webp" fetchpriority="high">

<!-- Baja prioridad — imágenes secundarias -->
<img src="decoracion.webp" fetchpriority="low">
```

**`decoding`**
```html
<!-- Decodificación asíncrona — no bloquea el hilo principal -->
<img src="hero.webp" decoding="async">
```

**Combinación óptima para el LCP:**
```html
<img
    src="/hero.webp"
    alt="Descripción"
    fetchpriority="high"
    loading="eager"
    decoding="async"
    width="1200"
    height="600"
>
```

**Combinación óptima para imágenes secundarias:**
```html
<img
    src="/producto.webp"
    alt="Descripción"
    loading="lazy"
    decoding="async"
    width="400"
    height="300"
>
```

> Definir siempre `width` y `height` en las imágenes para que el navegador pueda reservar el espacio antes de la descarga, eliminando el CLS.

### 5.5 Infraestructura: HTTP/3 y edge servers

| Versión  | Transporte  | Multiplexación          | Head-of-line blocking |
|----------|-------------|-------------------------|-----------------------|
| HTTP/1.1 | TCP         | No (una req. por conexión) | Sí                 |
| HTTP/2   | TCP         | Sí (múltiples streams)  | Sí (a nivel TCP)      |
| HTTP/3   | QUIC (UDP)  | Sí (múltiples streams)  | No                    |

**HTTP/3** elimina el head-of-line blocking a nivel de transporte usando **QUIC**, un protocolo construido sobre UDP que gestiona la fiabilidad por stream de forma independiente.

Beneficios adicionales de HTTP/3 / QUIC:
- **0-RTT connection resumption**: en reconexiones, el handshake se elimina completamente.
- **Connection migration**: la conexión sobrevive a cambios de red (wifi → 4G) sin reconectar.
- **Integrado con TLS 1.3**: el handshake de seguridad se hace en paralelo con el de transporte.

**Edge servers**: servir desde el edge significa ejecutar la lógica y entregar los assets desde nodos de la red lo más cercanos posible al usuario, reduciendo la latencia de red al mínimo físicamente posible.

Plataformas edge modernas que soportan HTTP/3 de forma nativa:
- Cloudflare Workers / Pages
- Fastly
- Vercel Edge Network
- AWS CloudFront

### 5.6 Cache-Control: TTL máximo para assets estáticos

Los assets con hash en el nombre (JS, CSS, imágenes con versión) son **inmutables**: su contenido nunca cambia porque cualquier cambio produce un nombre diferente. Para estos recursos el TTL óptimo es el máximo permitido por la especificación: **1 año**.

```
Cache-Control: public, max-age=31536000, immutable
```

| Directiva          | Significado                                                         |
|--------------------|---------------------------------------------------------------------|
| `public`           | Puede ser cacheado por proxies y CDNs, no sólo el navegador        |
| `max-age=31536000` | TTL de 365 × 24 × 60 × 60 segundos (1 año)                        |
| `immutable`        | El navegador no revalida el recurso durante el TTL, aunque el usuario haga hard refresh |

**Estrategia por tipo de recurso:**
```
/assets/main.abc123.js   → Cache-Control: public, max-age=31536000, immutable
/assets/style.def456.css → Cache-Control: public, max-age=31536000, immutable
/images/hero.v2.webp     → Cache-Control: public, max-age=31536000, immutable

/index.html              → Cache-Control: no-cache  (siempre revalidar)
/api/products            → Cache-Control: no-store  (nunca cachear)
```

> El HTML **nunca** debe tener TTL largo: es el documento que referencia los assets con hash, y debe estar siempre actualizado para que el navegador descargue las nuevas versiones cuando se despliega.

### 5.7 Compresión: Brotli

| Algoritmo | Ratio de compresión     | Velocidad de descompresión | Soporte                    |
|-----------|-------------------------|----------------------------|----------------------------|
| Gzip      | Baseline                | Rápida                     | Universal                  |
| Brotli    | ~20-26% mejor que Gzip  | Similar a Gzip             | Todos los navegadores modernos |

Brotli fue desarrollado por Google específicamente para la web. Usa un diccionario preentrenado con contenido web real, lo que le permite alcanzar ratios de compresión significativamente mejores que Gzip para HTML, CSS y JavaScript.

**Compresión estática vs dinámica:**
- **Compresión dinámica**: el servidor comprime cada respuesta en tiempo real. Mayor CPU, menor latencia para contenido dinámico.
- **Compresión estática**: los assets se precomprimen en build time y se sirven directamente. CPU cero en runtime, óptimo para JS/CSS.

### 5.8 Formatos de imagen: prioridad AVIF / WebP / fallback

| Formato | Compresión vs JPEG | Transparencia | Animación | Soporte            |
|---------|--------------------|---------------|-----------|--------------------|
| JPEG    | Baseline           | No            | No        | Universal          |
| PNG     | Peor (lossless)    | Sí            | No        | Universal          |
| WebP    | ~25-35% mejor      | Sí            | Sí        | 97%+ navegadores   |
| AVIF    | ~45-55% mejor      | Sí            | Sí        | 93%+ navegadores   |

**Elemento `<picture>` con fallback progresivo:**

```html
<picture>
    <!-- Primera opción: AVIF — mejor compresión, soporte mayoritario -->
    <source
        type="image/avif"
        srcset="/hero.avif 1x, /hero@2x.avif 2x"
    >
    <!-- Segunda opción: WebP — buena compresión, soporte amplio -->
    <source
        type="image/webp"
        srcset="/hero.webp 1x, /hero@2x.webp 2x"
    >
    <!-- Fallback: JPEG — soporte universal -->
    <img
        src="/hero.jpg"
        alt="Descripción de la imagen"
        width="1200"
        height="600"
        fetchpriority="high"
        loading="eager"
        decoding="async"
    >
</picture>
```

**Imágenes responsive con `srcset` y `sizes`:**

```html
<picture>
    <source
        type="image/avif"
        srcset="/hero-400.avif 400w, /hero-800.avif 800w, /hero-1200.avif 1200w"
        sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 1200px"
    >
    <source
        type="image/webp"
        srcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
        sizes="(max-width: 600px) 100vw, (max-width: 1200px) 50vw, 1200px"
    >
    <img src="/hero-1200.jpg" alt="..." width="1200" height="600">
</picture>
```

> Un usuario con móvil de 400px descarga ~40KB en lugar de ~200KB. En conexiones lentas la diferencia es determinante para el LCP.

### 5.9 Checklist de performance

Una buena práctica es validar estas decisiones con **Lighthouse** (integrado en Chrome DevTools) y **WebPageTest** para mediciones reales sobre red.

| Técnica                          | Impacto en        | Dificultad     |
|----------------------------------|-------------------|----------------|
| `preconnect` en orígenes críticos | LCP              | Baja           |
| `preload` del recurso LCP        | LCP               | Baja           |
| `font-display: swap`             | LCP / FCP         | Baja           |
| `loading="lazy"` en imágenes off-screen | Peso inicial | Mínima        |
| `fetchpriority="high"` en imagen LCP | LCP          | Mínima         |
| `decoding="async"`               | INP               | Mínima         |
| `width` y `height` en imágenes   | CLS               | Mínima         |
| AVIF / WebP con `<picture>`      | LCP / Peso        | Media          |
| Brotli en assets de texto        | Peso / LCP        | Infraestructura|
| `Cache-Control: immutable` 1 año | TTFB (repeat visits) | Infraestructura |
| HTTP/3 en edge server            | Latencia / LCP    | Infraestructura|

---

## Resumen

| Concepto                   | Clave                                                        |
|----------------------------|--------------------------------------------------------------|
| `CustomEvent`              | Comunicación desacoplada entre componentes                   |
| `bubbles` + `composed`     | El evento atraviesa Shadow DOM boundaries                    |
| `structuredClone`          | Copia profunda para evitar mutaciones entre componentes      |
| Componente presentacional  | Renderiza datos, sin lógica de negocio                       |
| Componente contenedor      | Gestiona estado e interacción                                |
| Clase de servicio          | Lógica pura, sin dependencia del DOM                         |
| Delegación de eventos      | Un listener en el padre, `composedPath` para identificar origen |
| `preconnect`               | Establece conexión anticipada con orígenes externos          |
| `preload`                  | Descarga anticipada de recursos críticos                     |
| `font-display: swap`       | Evita texto invisible durante la carga de fuentes            |
| `loading="lazy"`           | Carga diferida de imágenes fuera del viewport                |
| `fetchpriority="high"`     | Prioriza la imagen del LCP                                   |
| `decoding="async"`         | Decodificación de imagen sin bloquear el hilo principal      |
| `width` / `height`         | Reserva espacio para eliminar CLS                            |
| HTTP/3 + edge              | QUIC elimina head-of-line blocking; edge reduce latencia geográfica |
| `Cache-Control: immutable` | TTL 1 año para assets con hash — cero requests en visitas repetidas |
| Brotli                     | ~25% mejor compresión que Gzip para HTML/CSS/JS              |
| AVIF / WebP + `<picture>`  | Fallback progresivo: formato más eficiente que soporte el navegador |
| Lighthouse                 | Herramienta de auditoría integrada en Chrome DevTools        |
