# SonarCloud — Análisis de calidad

SonarCloud proporciona análisis estático continuo del código fuente: detecta bugs,
vulnerabilidades de seguridad, code smells y mide la cobertura de tests de forma
automática en cada push y cada Pull Request.

!!! info "Complemento al Agente 9"
    SonarCloud y el [Agente 9 — Revisor / QA](solid.md) son
    **complementarios**: SonarCloud cubre análisis estático automático (bugs, seguridad,
    duplicación, cobertura); el Agente 9 cubre cumplimiento SOLID, que ninguna
    herramienta de análisis estático detecta de forma fiable.

    | Capacidad | SonarCloud | Agente 9 |
    |-----------|:----------:|:--------:|
    | Bugs y code smells | ✅ | ❌ |
    | Vulnerabilidades de seguridad | ✅ | ❌ |
    | Cobertura de tests (%) | ✅ | ❌ |
    | Duplicación de código | ✅ | ❌ |
    | Principios SOLID | ❌ | ✅ |
    | Convenciones TypeScript del proyecto | Parcial | ✅ |

---

## Configuración del proyecto

### Ficheros añadidos al repositorio

| Fichero | Propósito |
|---------|-----------|
| `sonar-project.properties` | Configuración del proyecto: clave, organización, rutas de fuentes y cobertura |
| `.github/workflows/sonarcloud.yml` | Workflow que ejecuta el análisis en cada push y PR |

### Qué analiza

```
sonar.sources=.
```

SonarCloud escanea todos los ficheros **TypeScript y JavaScript** del repositorio,
excluyendo automáticamente:

- `node_modules/`, `dist/`, `site/`, `coverage/`
- Artefactos generados del pipeline (`03-generated-artifacts/`, `04-use-cases/`)
- Bocetos y documentación (`01-boceto/`, `02-conversacion-cliente/`, `docs/`)
- Ficheros no código (`.css`, `.html`, `.md`, `.sql`, `.json`)

Los ficheros de test (`*.test.ts`, `*.spec.ts`) se identifican como tests — se
analizan para cobertura pero no se incluyen en las métricas de calidad del código fuente.

### Cobertura de tests

El workflow ejecuta:

```bash
bun test --coverage --coverage-reporter=lcov
```

Esto genera `coverage/lcov.info`, que SonarCloud consume para mostrar el porcentaje
de líneas, ramas y funciones cubiertas por los tests unitarios.

---

## Activación (pasos manuales)

SonarCloud requiere configuración manual en su portal la primera vez:

1. **Crear cuenta** en [sonarcloud.io](https://sonarcloud.io) con la cuenta GitHub
   `dbetancorfp`

2. **Importar el repositorio** desde el portal de SonarCloud:
   - *My Projects → Analyze new project → Import from GitHub*
   - Seleccionar `CORRECTOR_DE_PROYECTOS`

3. **Anotar la clave del proyecto y la organización** — deben coincidir con los
   valores de `sonar-project.properties`:
   ```
   sonar.projectKey=dbetancorfp_CORRECTOR_DE_PROYECTOS
   sonar.organization=dbetancorfp
   ```

4. **Añadir el secreto `SONAR_TOKEN`** al repositorio GitHub:
   - SonarCloud → *My Account → Security → Generate Token*
   - GitHub repo → *Settings → Secrets → Actions → New repository secret*
   - Nombre: `SONAR_TOKEN`, valor: el token generado

5. **Verificar** que el workflow `SonarCloud Analysis` aparece en verde en
   [GitHub Actions](https://github.com/dbetancorfp/CORRECTOR_DE_PROYECTOS/actions)

---

## Quality Gate

SonarCloud aplica por defecto el **Sonar Way Quality Gate**, que exige en código nuevo:

| Métrica | Umbral |
|---------|--------|
| Cobertura | ≥ 80 % |
| Duplicación | ≤ 3 % |
| Issues de fiabilidad | 0 bugs |
| Issues de seguridad | 0 vulnerabilidades |
| Maintainability rating | A |

Un PR no debe mergearse si su Quality Gate está en ❌.

---

## Integración con el pipeline de agentes

```
Agente 6 (TDD) → tests en rojo
Agente 7 (Implementador) → tests en verde
       ↓
Agente 9 (Revisor) → auditoría SOLID
       ↓
SonarCloud → análisis estático automático (en cada push)
       ↓
Quality Gate ✅ → PR listo para merge
```

Cuando el Quality Gate falla en un PR, se abre un
**[Issue de GitHub](https://github.com/dbetancorfp/CORRECTOR_DE_PROYECTOS/issues)**
con la etiqueta `quality` indicando qué métrica no se cumple.

---

## Estado

!!! success "SonarCloud activo"
    El análisis CI está operativo desde el 2026-06-06. Automatic Analysis
    desactivado — el scanner corre exclusivamente vía GitHub Actions.

## Dashboard

**[sonarcloud.io/project/overview?id=dbetancorfp_CORRECTOR_DE_PROYECTOS](https://sonarcloud.io/project/overview?id=dbetancorfp_CORRECTOR_DE_PROYECTOS)**
