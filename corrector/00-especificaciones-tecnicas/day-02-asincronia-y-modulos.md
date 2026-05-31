# JavaScript Avanzado — Día 2
## Asincronía, azúcar sintáctico y módulos

---

## 1. Valores truthy y falsy

JavaScript evalúa cualquier expresión en un contexto booleano. Es fundamental conocer qué valores se consideran `false` para evitar errores difíciles de detectar.

**Valores falsy:**
```js
0          // false
''         // false
false      // false
null       // false
undefined  // false
NaN        // false
```

**Valores truthy destacados:**
```js
[]    // true — array vacío es truthy
{}    // true — objeto vacío es truthy
'0'   // true — string no vacío
```

**Igualdad estricta vs débil:**
```js
1 == '1'   // true  — convierte tipos antes de comparar
1 === '1'  // false — compara tipo y valor
```

> Usar siempre `===` y `!==`. El operador `==` produce comportamientos difíciles de predecir por las reglas de coerción implícita.

---

## 2. Azúcar sintáctico ES2015+

### 2.1 Rest parameters

Permite capturar un número indeterminado de argumentos como array. Sólo puede aparecer **una vez** y en la **última posición**:

```js
function sum(...values) {
    return values.reduce((a, v) => a + v)
}
sum(1, 2, 3)       // 6
sum(1, 2, 3, 4, 5) // 15
```

### 2.2 Parámetros por defecto

Los parámetros con valor por defecto deben ir al final de la lista:

```js
function sum(a, b = 4) {
    return a + b
}
sum(3)    // 7
sum(4, 5) // 9
```

### 2.3 Spread operator

Expande un iterable en posiciones individuales. Útil para clonar y combinar arrays y objetos (clonación **superficial**):

```js
// Arrays
const a = [1, 2, 3]
const b = [4, 5, 6]
const c = [...a, ...b]  // [1, 2, 3, 4, 5, 6]

// Objetos — la última clave gana en caso de colisión
const foo    = { id: 1, name: 'pedro' }
const bar    = { name: 'pedro hurtado' }
const result = { ...foo, ...bar }  // { id: 1, name: 'pedro hurtado' }
```

> Para clonación profunda: `structuredClone`

### 2.4 Destructuring

Extrae valores de arrays u objetos en variables locales:

```js
// Array
const arr = [1, 2, 3, 4, 5, 6]
const [a, b, ...rest] = arr
// a = 1, b = 2, rest = [3, 4, 5, 6]

// Objeto
const foo = { id: 1, name: 'pedro', phone: '666000000' }
const { id, name, ...rest } = foo

// En parámetros de función
function print({ id, name }) {
    console.log(id, name)
}
print(foo)
```

### 2.5 Operadores de cortocircuito y encadenamiento

```js
// AND lógico — evalúa el segundo operando sólo si el primero es truthy
a && a.b()

// Optional chaining — no lanza error si a es null/undefined
a?.b()

// Nullish coalescing — usa el valor derecho sólo si el izquierdo es null/undefined
const value = a ?? 'default'
```

---

## 3. Closures

Una closure es una función que **recuerda el entorno léxico** en el que fue creada, manteniendo acceso a las variables de ese ámbito incluso después de que la función exterior haya terminado de ejecutarse.

```js
function sum(a) {
    return function(b) {
        return a + b  // 'a' sigue accesible por closure
    }
}
sum(5)(3) // 8
```

**Caso de uso real: gestión de eventos con cleanup**

```js
function events(node, event, cb) {
    node.addEventListener(event, cb)
    return () => node.removeEventListener(event, cb) // disposable
}

const dispose = events(button, 'click', handler)
// Más tarde:
dispose() // elimina el listener sin referencias externas
```

**Caso de uso avanzado: señales reactivas**

Las closures son la base del sistema de señales que utilizan los frameworks modernos de UI:

```js
function signal(value) {
    let state = value
    const fn = () => state               // getter
    fn.update = (newValue) => {
        if (newValue !== state) {
            state = newValue
            // notificar suscriptores
        }
    }
    return Object.freeze(fn)
}

const count = signal(0)
count()          // 0
count.update(1)
count()          // 1
```

---

## 4. Generators

Los generators son funciones que pueden **pausar y reanudar** su ejecución mediante `yield`. Resuelven dos problemas habituales de las operaciones sobre colecciones: el consumo de memoria y el bloqueo del hilo principal.

```js
// Versión clásica — crea un array completo en memoria
function filter(array, predicate) {
    const result = []
    for (const value of array) {
        if (predicate(value)) result.push(value)
    }
    return result
}

// Versión con generator — produce un valor cada vez que se solicita
function* filterGenerator(array, predicate) {
    for (const value of array) {
        if (predicate(value)) yield value
    }
}

const gen = filterGenerator([1, 2, 3, 4, 5, 6], v => v % 2 === 0)
gen.next() // { value: 2, done: false }
gen.next() // { value: 4, done: false }
gen.next() // { value: 6, done: false }
gen.next() // { value: undefined, done: true }
```

Los generators implementan el protocolo **iterable**, por lo que se pueden usar directamente con `for...of`:

```js
for (const value of filterGenerator([1,2,3,4,5,6], v => v % 2 === 0)) {
    console.log(value) // 2, 4, 6
}
```

---

## 5. Programación asíncrona

JavaScript es **single-threaded**: sólo puede ejecutar una operación a la vez. La asincronía se gestiona a través del **event loop**, que coordina tres colas de ejecución:

- **Call stack**: ejecución síncrona, LIFO.
- **Microtask queue**: Promises y `queueMicrotask`. Se vacía completamente antes de pasar al siguiente task.
- **Task queue (macrotask)**: `setTimeout`, `setInterval`, eventos del DOM.

**Orden de ejecución:**

```js
console.log("Start")                           // 1 — síncrono
setTimeout(() => console.log("Timeout"), 0)    // 4 — macrotask
Promise.resolve()
    .then(() => console.log("Promise1"))       // 2 — microtask
    .then(() => console.log("Promise2"))       // 3 — microtask
console.log("End")                             // 1 — síncrono

// Salida: Start → End → Promise1 → Promise2 → Timeout
```

### 5.1 Callbacks

El patrón original de asincronía en Node.js. Sigue la convención **error-first**: el primer argumento del callback es siempre el error (o `null`).

```js
function getCustomer(id, cb) {
    if (id === 1) cb(null, { id })
    else          cb("Cliente no encontrado", null)
}

getCustomer(1, (error, customer) => {
    if (error) return console.log(error)
    console.log(customer)
})
```

> **Problema**: el anidamiento de callbacks genera el llamado *callback hell*, código difícil de leer y mantener.

### 5.2 Promises

Objeto que representa una operación asíncrona que puede estar en estado `pending`, `fulfilled` o `rejected`. Permite encadenar operaciones con `.then()` y gestionar errores con `.catch()`.

```js
function getCustomer(id) {
    return new Promise((resolve, reject) => {
        if (id === 1) resolve({ id })
        else          reject("Cliente no encontrado")
    })
}

getCustomer(1)
    .then(({ id }) => getInvoices(id))
    .then(invoices => console.log(invoices))
    .catch(err => console.log(err))
    .finally(() => { /* siempre se ejecuta */ })
```

### 5.3 Async / Await

Azúcar sintáctico sobre Promises que permite escribir código asíncrono con apariencia síncrona. Una función `async` siempre devuelve una Promise.

```js
async function main(id) {
    try {
        const customer = await getCustomer(id)
        const invoices = await getInvoices(customer.id)
        console.log(invoices)
    } catch (err) {
        console.log(err)
    } finally {
        // siempre se ejecuta
    }
}
```

|                    | Callbacks              | Promises                 | Async/Await            |
|--------------------|------------------------|--------------------------|------------------------|
| Legibilidad        | Baja (anidamiento)     | Media                    | Alta                   |
| Gestión de errores | Manual en cada nivel   | `.catch()` centralizado  | `try/catch`            |
| Composición        | Difícil                | `.then()` encadenado     | Secuencial natural     |

---

## 6. Módulos ES

Los módulos permiten dividir el código en ficheros con **ámbito propio**. Nada es global por defecto — todo lo que no se exporte es privado al módulo.

### 6.1 Exportación e importación

```js
// operators.mjs
export function sum(a, b)            { return a + b }
export function resta(a, b)          { return a - b }
export function multiplicacion(a, b) { return a * b }
export default function defaultExport() {}

// main.js
import defaultExport, { sum, resta, multiplicacion as m } from './operators.mjs'
import * as op from './operators.mjs'

console.log(sum(5, 3))              // 8
console.log(op.multiplicacion(5, 3)) // 15
console.log(m(6, 5))               // 30
```

### 6.2 Import dinámico (lazy loading)

Permite cargar un módulo **en tiempo de ejecución**, bajo demanda. El resultado es una Promise que resuelve con el módulo.

```js
document.addEventListener('click', async (ev) => {
    const node = ev.composedPath().find(n => n.dataset && 'page' in n.dataset)
    if (node) {
        const module = await import(`./${node.dataset.page}.js`)
        module.default()
    }
})
```

Este patrón es la base del **code splitting** que implementan herramientas como Vite, Rollup o Webpack: sólo se descarga el código cuando se necesita.

### 6.3 IIFE (Immediately Invoked Function Expression)

Precursor histórico de los módulos: función que se ejecuta inmediatamente para crear un ámbito privado y evitar contaminar el ámbito global.

```js
(function() {
    // código privado
})()
```

---

## Resumen

| Concepto          | Clave                                                          |
|-------------------|----------------------------------------------------------------|
| Truthy / Falsy    | Usar siempre `===`; conocer los 6 valores falsy                |
| Rest / Spread     | `...args` recibe; `...obj` expande                             |
| Destructuring     | Extracción limpia de valores de arrays y objetos               |
| Optional chaining | `?.` evita errores en cadenas de acceso                        |
| Closures          | Función que recuerda su ámbito léxico de creación              |
| Generators        | `function*` / `yield` — producción lazy de valores            |
| Event loop        | Call stack → Microtasks → Macrotasks                           |
| Callbacks         | Error-first, base histórica de la asincronía en Node           |
| Promises          | `.then()` / `.catch()` / `.finally()`                          |
| Async/Await       | Código asíncrono con apariencia síncrona                       |
| Módulos ES        | Ámbito por fichero, exportación explícita                      |
| Import dinámico   | Carga bajo demanda, base del code splitting                    |
