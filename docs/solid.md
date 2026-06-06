# Principios SOLID

Guía de referencia para los agentes que generan código en este proyecto.
Todo el código producido — backend Bun + Express y frontend Web Components — debe
respetar estos cinco principios. Son la fuente de verdad de calidad de diseño.

!!! quote "Origen"
    Los principios SOLID fueron introducidos por Robert C. Martin en su artículo
    *Design Principles and Design Patterns* (2000) y consolidados bajo el acrónimo
    SOLID por Michael Feathers (~2004). Son el estándar de facto del diseño
    orientado a objetos moderno.

!!! info "Relación con SonarCloud"
    SOLID y [SonarCloud](sonarcloud.md) son **complementarios**. SonarCloud detecta
    bugs, vulnerabilidades, code smells y cobertura de forma automática en cada push.
    SOLID cubre la calidad de diseño semántica que ninguna herramienta estática puede
    detectar de forma fiable. **El Agente 9 verifica ambos** antes de dar el PASS.

---

## Resumen rápido

| Letra | Principio | En una frase |
|-------|-----------|--------------|
| **S** | Single Responsibility | Un módulo, una razón para cambiar |
| **O** | Open / Closed | Extender sin modificar |
| **L** | Liskov Substitution | Un subtipo puede reemplazar a su supertipo sin sorpresas |
| **I** | Interface Segregation | No fuerces a implementar lo que no se usa |
| **D** | Dependency Inversion | Depende de abstracciones, no de concreciones |

---

## S — Single Responsibility Principle

> *"A class should have one and only one reason to change."*
> — Robert C. Martin

### Qué significa

Cada clase, módulo o función tiene **una sola responsabilidad**. Si un componente
cambia por dos razones distintas, tiene dos responsabilidades y viola SRP.

### Anti-patrón

```ts
// ❌ VIOLA SRP — mezcla lógica de negocio y presentación
class RubricaService {
  calcularNota(rubricaId: string): number { /* ... */ }

  // Esta responsabilidad no pertenece aquí
  formatearNotaHtml(nota: number): string {
    return `<strong>${nota.toFixed(2)}</strong>`;
  }

  // Ni esta
  enviarNotificacionEmail(profesorId: string, nota: number): void { /* ... */ }
}
```

`RubricaService` cambia cuando cambia la lógica de cálculo,
cuando cambia el formato HTML *y* cuando cambia la lógica de email.
Tres razones de cambio = tres responsabilidades.

### Patrón correcto

```ts
// ✅ RESPETA SRP — una responsabilidad por clase
class RubricaService {
  calcularNota(rubricaId: string): number { /* sólo lógica de negocio */ }
}

class RubricaFormatter {
  toHtml(nota: number): string {
    return `<strong>${nota.toFixed(2)}</strong>`;
  }
}

class NotificacionService {
  enviarNota(profesorId: string, nota: number): Promise<void> { /* ... */ }
}
```

### Aplicación en este proyecto

| Capa | Regla |
|------|-------|
| **Rutas Express** | Solo enrutan la petición — no contienen lógica de negocio |
| **Services** | Solo lógica de dominio — no acceden a HTTP ni formatean respuestas |
| **Repositories** | Solo acceso a datos — no aplican reglas de negocio |
| **Web Components** | Solo renderizado y eventos — no llaman a la API directamente |

---

## O — Open / Closed Principle

> *"Software entities should be open for extension, but closed for modification."*
> — Bertrand Meyer / Robert C. Martin

### Qué significa

Puedes **añadir** nueva funcionalidad sin **modificar** el código existente que ya
funciona. Se consigue diseñando con abstracciones (interfaces, clases base) en lugar
de con condicionales que crecen al añadir casos.

### Anti-patrón

```ts
// ❌ VIOLA OCP — cada nueva forma de exportar exige modificar esta función
function exportarNotas(formato: string, notas: Nota[]): string {
  if (formato === 'json') {
    return JSON.stringify(notas);
  } else if (formato === 'csv') {
    return notas.map(n => `${n.alumnoId},${n.valor}`).join('\n');
  }
  // ¿Añadir PDF? Toca modificar este bloque → riesgo de romper JSON y CSV
  throw new Error('Formato no soportado');
}
```

### Patrón correcto

```ts
// ✅ RESPETA OCP — nueva exportación = nueva clase, sin tocar las existentes
interface NotasExporter {
  export(notas: Nota[]): string;
}

class JsonExporter implements NotasExporter {
  export(notas: Nota[]): string {
    return JSON.stringify(notas);
  }
}

class CsvExporter implements NotasExporter {
  export(notas: Nota[]): string {
    return notas.map(n => `${n.alumnoId},${n.valor}`).join('\n');
  }
}

// Añadir PDF: solo crear PdfExporter — JsonExporter y CsvExporter no cambian
class PdfExporter implements NotasExporter {
  export(notas: Nota[]): string { /* ... */ }
}

function exportarNotas(exporter: NotasExporter, notas: Nota[]): string {
  return exporter.export(notas);
}
```

### Aplicación en este proyecto

- Los **niveles de la rúbrica** (Excelente, Muy bien, Bien, Regular, Mal) están
  fijados por el dominio. Si se añade lógica de cálculo para un nuevo tipo de ítem,
  se extiende mediante una nueva implementación, no modificando el servicio existente.
- Los **Web Components** exponen atributos y slots como puntos de extensión.
  Nunca se modifica un componente ya testeado para añadir variantes; se extiende
  o se compone.

---

## L — Liskov Substitution Principle

> *"Functions that use pointers to base classes must be able to use objects of derived
> classes without knowing it."*
> — Barbara Liskov, 1987

### Qué significa

Cualquier subtipo debe poder **sustituir** a su supertipo sin que el programa se rompa
ni se comporte de forma inesperada. Los subtipos deben **honrar el contrato** (tipos de
retorno, excepciones, invariantes) establecido por el supertipo.

### Anti-patrón

```ts
// ❌ VIOLA LSP — el subtipo rompe el contrato del supertipo
class AreaCalculator {
  sum(shapes: Shape[]): number {   // devuelve number
    return shapes.reduce((acc, s) => acc + s.area(), 0);
  }
}

class VolumeCalculator extends AreaCalculator {
  sum(shapes: Shape[]): number {
    // Lanza excepción cuando el supertipo garantizaba un número
    if (shapes.some(s => !('volume' in s))) {
      throw new Error('Shape without volume');
    }
    return shapes.reduce((acc, s) => acc + (s as Solid).volume(), 0);
  }
}

// Código cliente que usa AreaCalculator no puede asumir que VolumeCalculator funciona igual
```

### Patrón correcto

```ts
// ✅ RESPETA LSP — el subtipo cumple el contrato
class VolumeCalculator extends AreaCalculator {
  // Devuelve number, no lanza excepciones inesperadas
  sum(shapes: Solid[]): number {
    return shapes.reduce((acc, s) => acc + s.volume(), 0);
  }
}
```

### Regla práctica en TypeScript

Usa `readonly` e interfaces con contratos claros. Si un subtipo necesita
lanzar una excepción que el supertipo no lanza, es señal de que la jerarquía
está mal diseñada — considera composición en lugar de herencia.

### Aplicación en este proyecto

- Los **Web Components** que extienden `HTMLElement` deben implementar todos los
  callbacks del ciclo de vida que el sistema espera (`connectedCallback`,
  `disconnectedCallback`). Un componente que ignora `disconnectedCallback` y no
  limpia sus listeners viola LSP.
- Los **repositorios** que implementan una interfaz deben devolver siempre el mismo
  tipo y nunca lanzar excepciones que la interfaz no declara.

---

## I — Interface Segregation Principle

> *"Clients should not be forced to depend upon interfaces that they do not use."*
> — Robert C. Martin

### Qué significa

Las interfaces deben ser **pequeñas y específicas**. Una interfaz gorda que agrupa
métodos de distintos contextos obliga a las clases implementadoras a definir métodos
que no les corresponden.

### Anti-patrón

```ts
// ❌ VIOLA ISP — una sola interfaz para formas 2D y 3D
interface Shape {
  area(): number;
  volume(): number;   // ¿qué hace un cuadrado con esto?
  perimeter(): number;
}

class Square implements Shape {
  area(): number { return this.side ** 2; }
  perimeter(): number { return 4 * this.side; }

  volume(): number {
    throw new Error('Un cuadrado no tiene volumen');  // método forzado
  }
}
```

### Patrón correcto

```ts
// ✅ RESPETA ISP — interfaces pequeñas y cohesionadas
interface TwoDimensionalShape {
  area(): number;
  perimeter(): number;
}

interface ThreeDimensionalShape extends TwoDimensionalShape {
  volume(): number;
}

class Square implements TwoDimensionalShape {
  area(): number { return this.side ** 2; }
  perimeter(): number { return 4 * this.side; }
  // No implementa volume() — correcto
}

class Cube implements ThreeDimensionalShape {
  area(): number { /* superficie */ }
  perimeter(): number { /* ... */ }
  volume(): number { return this.side ** 3; }
}
```

### Aplicación en este proyecto

```ts
// Interfaces del dominio — específicas por rol
interface AlumnoReader {
  findById(id: string): Promise<Alumno | null>;
  findByCiclo(cicloId: string): Promise<Alumno[]>;
}

interface AlumnoWriter {
  create(data: CreateAlumnoDto): Promise<Alumno>;
  update(id: string, data: UpdateAlumnoDto): Promise<Alumno>;
  delete(id: string): Promise<void>;
}

// Un repositorio de sólo lectura no implementa AlumnoWriter
class AlumnoReadOnlyRepository implements AlumnoReader { /* ... */ }

// El repositorio completo implementa ambas
class AlumnoRepository implements AlumnoReader, AlumnoWriter { /* ... */ }
```

Los **Web Components** siguen ISP de forma natural: cada atributo público y cada
evento publicado es un contrato mínimo. No expongas métodos internos en la API
pública del elemento.

---

## D — Dependency Inversion Principle

> *"High-level modules should not depend on low-level modules. Both should depend on
> abstractions. Abstractions should not depend on details. Details should depend on
> abstractions."*
> — Robert C. Martin

### Qué significa

Los módulos de alto nivel (lógica de negocio) no deben importar directamente módulos
de bajo nivel (base de datos, HTTP, sistema de ficheros). Ambos deben depender de una
**interfaz** (abstracción). Así, cambiar la implementación concreta no afecta a la
lógica de negocio.

### Anti-patrón

```ts
// ❌ VIOLA DIP — el servicio de alto nivel depende de la implementación concreta
import { PostgresRubricaRepository } from './postgres-rubrica-repository';

class RubricaService {
  private repo = new PostgresRubricaRepository();   // acoplamiento duro

  async calcularNota(rubricaId: string): Promise<number> {
    const rubrica = await this.repo.findById(rubricaId);
    /* ... */
  }
}
// Imposible testear sin PostgreSQL real
// Cambiar a otro motor de BD exige modificar RubricaService
```

### Patrón correcto

```ts
// ✅ RESPETA DIP — el servicio depende de la abstracción
interface RubricaRepository {
  findById(id: string): Promise<Rubrica | null>;
  findByModulo(moduloId: string): Promise<Rubrica | null>;
}

class RubricaService {
  constructor(private readonly repo: RubricaRepository) {}

  async calcularNota(rubricaId: string): Promise<number> {
    const rubrica = await this.repo.findById(rubricaId);
    if (!rubrica) throw new Error(`Rúbrica ${rubricaId} no encontrada`);
    /* lógica de cálculo */
  }
}

// Producción: inyectar la implementación real
const service = new RubricaService(new PostgresRubricaRepository(db));

// Tests: inyectar un doble
const service = new RubricaService(new InMemoryRubricaRepository());
```

### Aplicación en este proyecto

```ts
// Contrato del cliente Claude — no depender del SDK directamente en el servicio
interface LlmClient {
  complete(prompt: string): Promise<string>;
}

// Contrato del cliente RAG
interface RagClient {
  store(artifact: Artifact): Promise<void>;
  retrieve(query: string, filters: RagFilters): Promise<Artifact[]>;
}

// El agente depende sólo de abstracciones
class DesignerFrontAgent {
  constructor(
    private readonly llm: LlmClient,
    private readonly rag: RagClient,
  ) {}

  async run(featureId: string): Promise<void> { /* ... */ }
}
```

Las dependencias concretas (`AnthropicClient`, `PgVectorRagClient`) se inyectan
desde el punto de entrada (`cli/commands/run-agent.js`), nunca se instancian dentro
de los servicios.

---

## Cómo aplican los agentes estos principios

### Agente 6 — Ingeniero TDD

Los tests son el espejo de SOLID. Un test que necesita un setup enorme para aislar
una unidad es síntoma de violaciones de DIP o SRP. Cada `describe()` debe poder
testear su unidad con un doble simple inyectado por constructor.

Reglas adicionales en `lib/agents/tdd-engineer/tdd-engineer.md` → sección *Principios SOLID en los tests*.

### Agente 7 — Implementador

Al generar código de backend y frontend, verifica que cada fichero generado cumple el
checklist SOLID antes de marcarlo como terminado:

| Check | Criterio |
|-------|----------|
| SRP | ¿El fichero tiene más de una razón para cambiar? Si sí, separa en dos. |
| OCP | ¿Añadir un nuevo tipo exige modificar código existente? Si sí, introduce una interfaz. |
| LSP | ¿El subtipo lanza excepciones o devuelve tipos distintos que el supertipo? Si sí, rediseña la jerarquía. |
| ISP | ¿La interfaz tiene métodos que algún implementador no usa? Si sí, segrega. |
| DIP | ¿El módulo de negocio hace `new ConcreteImpl()`? Si sí, inyecta la dependencia. |

Checklist completo y ejemplos TypeScript en `lib/agents/implementer/implementer.md` → sección *Principios SOLID*.

### Agente 9 — Revisor / QA

**Auditoría SOLID con bucle de corrección.** El Agente 9 es el guardián final de la
calidad: audita cada fichero generado por los Agentes 6 y 7, genera un
`review-report.md` con resultado `PASS ✅` o `FAIL ❌`, y si detecta violaciones
**re-ejecuta al agente responsable** hasta que el código supere la auditoría.

```
MIENTRAS haya violaciones bloqueantes:
  violaciones en tests → /tdd-engineer
  violaciones en src/  → /implementer
  re-auditar y repetir
FIN → PASS ✅ → avanzar al Agente 8 (E2E)
```

Proceso completo en `lib/agents/reviewer/reviewer.md`.

---

## Referencias

| Fuente | URL |
|--------|-----|
| Wikipedia — SOLID | https://en.wikipedia.org/wiki/SOLID |
| DigitalOcean — SOLID principles | https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design |
| freeCodeCamp — SOLID in software development | https://www.freecodecamp.org/news/solid-design-principles-in-software-development/ |
| GeeksforGeeks — SOLID with real-life examples | https://www.geeksforgeeks.org/system-design/solid-principle-in-programming-understand-with-real-life-examples/ |
