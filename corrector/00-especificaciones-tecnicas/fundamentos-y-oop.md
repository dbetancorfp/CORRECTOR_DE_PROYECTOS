# JavaScript Avanzado — Día 1
## Fundamentos del lenguaje y Programación Orientada a Objetos

---

## 1. Introducción al lenguaje

JavaScript es un lenguaje de **propósito general** que soporta múltiples paradigmas de programación: orientado a objetos, funcional y scripting. Sus características más relevantes son:

- **Dinámico**: los atributos de un objeto pueden crearse en tiempo de ejecución.
- **Débilmente tipado**: una variable puede cambiar de tipo durante la ejecución.
- **Interpretado / JIT compilado**: los motores modernos (V8, SpiderMonkey) compilan el código en tiempo de ejecución para optimizar el rendimiento.

JavaScript sigue la especificación **ECMAScript** mantenida por TC39. Las versiones más relevantes históricamente son ES5 (2009), ES6/ES2015 (que supuso una renovación completa del lenguaje) y las publicaciones anuales desde entonces.

---

## 2. Variables y ámbito

### 2.1 `var`

`var` declara variables con **ámbito de función** y sufre *hoisting* (la declaración se eleva al inicio del contexto de ejecución). Esto provoca comportamientos inesperados en bucles y condicionales.

```js
function iterator() {
    for (var i = 0; i < 100; i++) {
        console.log(i)
    }
    console.log(i) // 100 — accesible fuera del bucle
}
```

Internamente, el motor trata la declaración como:

```js
function iterator() {
    var i;
    for (i = 0; i < 100; i++) { ... }
}
```

### 2.2 `let`

`let` declara variables con **ámbito de bloque**. La variable sólo existe dentro del bloque `{}` donde se declara.

```js
function iterator() {
    for (let i = 0; i < 100; i++) {
        console.log(i)
    }
    console.log(i) // ReferenceError
}
```

### 2.3 `const`

`const` declara referencias **inmutables**: no se puede reasignar la variable, pero sí mutar el contenido del objeto o array al que apunta.

```js
const obj = {}
obj = null      // TypeError — no se puede reasignar
obj.id = 10     // OK — se muta el objeto

const arr = []
arr = [1, 2, 3] // TypeError
arr.push(1)     // OK
```

---

## 3. El contexto de ejecución: `this`

En JavaScript, `this` hace referencia al **objeto propietario** del contexto de ejecución en el momento de la llamada. Su valor no depende de dónde se define la función, sino de **cómo se invoca**.

### 3.1 Pérdida de ámbito

Cuando se asigna un método a una variable o se pasa como callback, se pierde la referencia al objeto original:

```js
const foo = {
    x: 11,
    write: function() { console.log(this.x) }
}

foo.write()          // 11 — llamada como método
const writer = foo.write
writer()             // undefined (o window.x en navegador)
```

### 3.2 `bind`, `call` y `apply`

Estas tres funciones permiten establecer explícitamente el valor de `this`:

| Método  | Invocación                                  | Argumentos    |
|---------|---------------------------------------------|---------------|
| `bind`  | Retorna una nueva función con `this` fijado | Individuales  |
| `call`  | Invoca la función inmediatamente            | Individuales  |
| `apply` | Invoca la función inmediatamente            | Array         |

```js
function Foo(name) {
    this.name = name
}

const bar = {}
Foo.call(bar, "Pedro")      // bar.name === "Pedro"
Foo.apply(bar, ["Pedro"])   // equivalente
```

### 3.3 Arrow functions y `this`

Las arrow functions **no tienen su propio `this`**: capturan el `this` del contexto léxico donde se definen. Esto las hace ideales como callbacks, pero impide usarlas como métodos o constructores.

```js
class Foo {
    constructor() {
        new Bar(this.write.bind(this)) // opción 1: bind — fija this una vez
        new Bar(() => this.write())    // opción 2: arrow — ejecuta 2 frames por llamada
    }
    write() { console.log(this) }
}
```

---

## 4. Arrays y estructuras de datos

### 4.1 Métodos funcionales de Array

JavaScript ofrece una API funcional rica sobre arrays. Los métodos más importantes son:

```js
const a = [1, 2, 3, 4, 5, 6]

a.filter(v => v % 2 === 0)                          // [2, 4, 6]
a.find(v => v % 2 === 0)                            // 2
a.map(v => v * v)                                   // [1, 4, 9, 16, 25, 36]
a.filter(v => v % 2 === 0).map(v => v * v)          // [4, 16, 36]

// reduce: acumulador + valor actual
a.reduce((acc, v) => acc + v)                       // 21
a.reduce((acc, v) => acc + v, 100)                  // 121
```

### 4.2 `Set`

Colección de valores **únicos**. La unicidad se evalúa por referencia en el caso de objetos:

```js
const set1 = new Set([1, 2, 3, 3, 4, 4, 5])    // {1, 2, 3, 4, 5}
const set2 = new Set([{id: 1}, {id: 1}])         // 2 elementos — referencias distintas
```

### 4.3 `Map`

Colección clave-valor donde la clave puede ser de cualquier tipo (a diferencia de los objetos, cuyas claves son siempre strings o Symbols):

```js
const map = new Map()
map.set("key", 1)
map.get("key")      // 1
map.has("key")      // true
```

---

## 5. Programación Orientada a Objetos

### 5.1 Evolución histórica

Antes de ES2015, la OOP en JavaScript se construía manualmente sobre prototipos:

```js
// Pre-ES2015
function Foo(name) {
    this._name = name
}
Foo.prototype.write  = function() { this._write() }
Foo.prototype._write = function() { console.log(this._name) }
Foo.write = function() { console.log("static") }
```

ES2015 introdujo la sintaxis `class` como azúcar sintáctico sobre el sistema de prototipos:

```js
// ES2015+
class Foo {
    constructor(name) { this._name = name }
    write()  { this._write() }
    _write() { console.log(this._name) }
    static write() { console.log("static") }
}
```

> La sintaxis `class` **no introduce un nuevo modelo de herencia**. Sigue siendo herencia prototípica por debajo.

### 5.2 Cadena de prototipos

Todos los objetos tienen una referencia interna `[[Prototype]]` que forma una cadena hasta `null`. Cuando se accede a una propiedad, el motor la busca subiendo por esa cadena:

```
instancia → Foo.prototype → Object.prototype → null
```

---

## 6. Mixins

La herencia en JavaScript es **simple** (una clase sólo puede extender de una). Los mixins son un patrón para lograr **composición horizontal** de comportamientos sin herencia múltiple.

### 6.1 Patrón básico

Un mixin es una función que recibe una clase base y devuelve una nueva clase que la extiende:

```js
const Calculator = base => class extends base {
    calc() {}
}

const Randomizer = base => class extends base {
    randomize() {}
}

class Bar extends Calculator(Randomizer(class {})) {}
```

### 6.2 Builder de mixins

Para mejorar la legibilidad se puede construir un helper que aplique los mixins mediante `reduceRight`:

```js
class Mixin {
    constructor(Base) {
        this._Base = Base || class {}
    }
    withMixins(...mixins) {
        return mixins.reduceRight(
            (prototype, mixin) => mixin(prototype),
            this._Base
        )
    }
}

function inherit(Base = class {}) {
    return new Mixin(Base)
}
```

### 6.3 Ejemplo aplicado

```js
const Add    = base => class extends base { add()    {} }
const Update = base => class extends base { update() {} }
const Remove = base => class extends base { remove() {} }
const Get    = base => class extends base { get()    {} }

// Cliente con CRUD completo
class Customer extends inherit().withMixins(Add, Update, Remove, Get) {}

// Usuario de solo lectura
class User extends inherit().withMixins(Get) {}
```

---

## Resumen

| Concepto            | Clave                                                  |
|---------------------|--------------------------------------------------------|
| `var` / `let` / `const` | Ámbito de función vs bloque vs referencia inmutable |
| `this`              | Depende del punto de llamada, no de la definición      |
| `bind` / `call` / `apply` | Fijan explícitamente el contexto de ejecución    |
| Arrow functions     | Capturan el `this` léxico, no crean el suyo            |
| Array funcional     | `filter`, `map`, `reduce`, `find`                      |
| `Set` / `Map`       | Estructuras de datos nativas con semántica clara       |
| Prototipos          | Base real de la OOP en JavaScript                      |
| `class`             | Azúcar sintáctico sobre prototipos (ES2015)            |
| Mixins              | Composición horizontal sin herencia múltiple           |
