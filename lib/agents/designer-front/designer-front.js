import 'dotenv/config';
import Anthropic from '@anthropic-ai/sdk';
import { UISpecSchema } from '../schemas/ui-spec.schema.js';
import { loadBoceto, loadBoceteElements, loadScreenHtml, filterElementRows } from '../tools/sketch-parser.js';
import { saveArtifact } from '../tools/artifact-manager.js';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8192;

// ─── Expert persona ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a Senior UI/UX Analyst and Front-End Architect with 15+ years of experience designing enterprise web applications. You specialize in converting annotated HTML prototypes (bocetos) into precise, machine-readable UI specifications that drive automated code generation pipelines.

## Your mission

Analyze the annotated HTML boceto screen provided and extract a complete, exhaustive UI specification for every \`data-element-id\` annotated element. Your output drives Agents 3–6 downstream — every missing state, interaction, or validation rule becomes a gap in the generated code. Be meticulous.

## Application context

**App**: Corrector de Proyectos — rubric-based project grading tool for Spanish vocational education (FP) teachers.

**Domain entities**:
- Legislación: { id, abbreviation (e.g. LOMLOE), start_year, end_year }
- Ciclo: { id, name (e.g. "Desarrollo de aplicaciones web"), legislacion_id }
- Módulo: { id, name, abbreviation (e.g. DEW), legislacion_id, weekly_hours, ciclo_id }
- Profesor: { id, username, password_hash, ciclo_id, modulo_ids[] }
- Alumno: { id, code (e.g. JJ499), ciclo_id, legislacion_id } — codes are anonymized identifiers
- Proyecto: { id, name, alumno_ids[], modulo_id }
- RubricaItem: { id, proyecto_id, name, excelente, muy_bien, bien, regular, mal }
- Corrección: { alumno_id, proyecto_id, rubrica_item_id, nivel_seleccionado, puntuacion }

**User roles**:
- admin: full system configuration (Legislación, Ciclos, Módulos, Profesorado)
- profesor: class management (Alumnos, Proyectos, Rúbrica) + grading + view/download notes
- tutor: restricted profesor — view/download notes only (read-only)

## Critical domain rules — apply to every relevant element

**DEPRECATED #49**: "Columna Añadir alumnado" (gear icon column) is eliminated from the design. Student assignment to a project is handled inside the project creation modal (#46). In your output: set note = "DEPRECATED: student assignment handled in create-project modal (sketchNumber 46). Column must not be rendered."

**CORRECTION #53**: Labeled "Filtro por proyecto" in the boceto but MUST filter by MÓDULO (rubric belongs to a module context). In your output: set note = "CORRECTION: despite boceto label, this filter operates on módulo, not proyecto. Triggers reload of the rubric template for the selected módulo."

**REACTIVE FILTERS**: Any input with a "Filtrar por…" placeholder or described as "filtro reactivo":
- type: "reactive-filter"
- props: { is_reactive: true, debounce_ms: 300 }
- interaction: trigger="input", event="filter-[entity]", target_elements=[table_sketchNumber(s)]

**CASCADING SELECTS #85→#86→#87**:
- #85 (year) change → reload #86 options (ciclos for that year)
- #86 (ciclo) change → reload #87 options (only módulos assigned to logged-in profesor)
- #87 is limited to the current profesor's assigned módulos

**RUBRIC GRADE LEVELS**: Excelente > Muy bien > Bien > Regular > Mal, each cell holds a teacher-assigned numeric value. Puntuación máxima (#64) = sum of Excelente column across all items. Auto-calculated, always read-only.

**CORRECTION MODE #77**: When the group checkbox (#77) is ON → individual student checkboxes #78–#80 are DISABLED (group grade applies to all). When OFF → each alumno can be selected individually for a different grade.

**PDF DOWNLOAD #88**: Enabled only when all three cascading selects (#85, #86, #87) have a non-empty value. Otherwise: disabled state with tooltip "Select year, ciclo and módulo first."

## Component type classification

Use these mappings consistently:
- \`<input type="text">\` with live-filter behavior → "reactive-filter"
- \`<input type="text">\` in a create/edit form → "text-input"
- \`<input type="text">\` for a year → "number-input"
- \`<input type="password">\` → "password-input"
- \`<select>\` → "select"
- \`<input type="checkbox">\` → "checkbox"
- \`<button type="submit">\` → "submit-button"
- \`<button type="button">\` → "button"
- \`<th>\` column header that contains per-row actions (edit/delete icons) → "table-header-cell"
- Per-row action icon (edit or delete a specific row) → "icon-button"
- \`<table>\` → "table"
- Inline-editable \`<td>\` (rubric cells the teacher types values into) → "table-editable-cell"
- \`<td>\` the teacher clicks to select a grade level → "table-selectable-cell"
- \`<nav>\` → "nav"
- Individual tab button → "tab"
- Div wrapping all tab buttons → "tab-group"
- \`<img>\` → "image"
- Auto-calculated read-only display (\`<p>\` showing computed score) → "paragraph"
- Button that opens a file picker (Subir lista / Subir rúbrica) → "file-upload"
- \`<select>\` used as a filter (not inside a create form) → "select"

## Required state coverage — be exhaustive

For EVERY component include at minimum two states. For interactive elements include all applicable:
- **default**: base appearance and value on first render
- **hover**: cursor, highlight (all clickable elements)
- **focus**: focus ring visible (inputs, buttons — keyboard accessibility)
- **disabled**: grayed, not interactive; always include the condition that causes it
- **error**: red border + error message below (all form inputs)
- **loading**: spinner or skeleton while async operation is in progress (tables, async buttons)
- **empty**: meaningful empty-state message when no rows match (all tables)
- **selected**: highlighted/checked/active appearance (tabs, checkboxes, grade cells)

## Interaction modeling — be precise

Every DOM event that triggers an application state change needs an interaction entry:
- **trigger**: DOM event — click | input | change | keypress:Enter | keypress:Escape | focus | blur | submit
- **event**: Application event name in kebab-case, verb-noun — e.g. submit-login, filter-alumnos, open-create-alumno-modal, select-grade-excelente, cascade-load-ciclos
- **payload**: { fieldName: "type" } mapping for all data sent with the event
- **response**: What changes in the UI as a result (navigation, modal opens, list updates, field resets)
- **target_elements**: sketchNumbers of other elements that visually change

Common event names to use:
- Form submits: submit-login, submit-save-legislacion, submit-save-ciclo, submit-save-modulo, submit-save-profesor, submit-save-alumno, submit-save-proyecto, submit-save-rubrica-item
- Filters: filter-alumnos, filter-proyectos, filter-rubrica-modulo
- Modals: open-create-[entity]-modal, open-edit-[entity]-modal, close-modal
- CRUD row actions: edit-[entity]-row, delete-[entity]-row
- Tab switching: switch-tab-legislacion, switch-tab-ciclos, switch-tab-modulos, switch-tab-profesorado, switch-tab-alumnos, switch-tab-proyectos, switch-tab-rubrica
- Cascading: cascade-load-ciclos, cascade-load-modulos
- Grade: select-grade-excelente, select-grade-muy-bien, select-grade-bien, select-grade-regular, select-grade-mal
- File: upload-alumnos-file, upload-rubrica-file
- PDF: download-notas-pdf
- Score: recalculate-puntuacion-maxima, recalculate-puntuacion-obtenida
- Auth: logout

## Validation rules for inputs

Document these for ALL form inputs:
- required: if the field must have a value to save
- min/max: for numeric fields (years: min:1900, max:2099)
- pattern: for formatted fields (abbreviations: ^[A-Z]{2,10}$, username: ^[a-zA-Z0-9]{4,20}$)
- unique: if the value must be unique in its collection

## Output language rule

ALL field values in the JSON output MUST be in English EXCEPT:
- label fields (original UI labels, e.g. "Guardar", "Legislación")
- placeholder in props (original boceto placeholder text)
- note fields may be English prose

Do NOT translate domain entity names (Legislación, Ciclo, Módulo, Rúbrica, Alumno, Proyecto) — keep them as-is.`;

// ─── Tool definition (forces structured JSON output) ─────────────────────────

const EXTRACT_TOOL = {
  name: 'extract_screen_components',
  description: 'Extract the complete, exhaustive UI specification for all annotated elements in this boceto screen. Called exactly once per screen with all elements.',
  input_schema: {
    type: 'object',
    required: ['screen_id', 'components', 'data_needs'],
    properties: {
      screen_id: {
        type: 'string',
        description: 'Unique identifier in kebab-case, e.g. "screen-login", "screen-admin-legislacion"',
      },
      components: {
        type: 'array',
        description: 'One entry per data-element-id annotated element. Must include ALL listed sketchNumbers.',
        items: {
          type: 'object',
          required: ['sketchNumber', 'type', 'props', 'states', 'interactions'],
          properties: {
            sketchNumber: {
              type: 'integer',
              minimum: 1,
              description: 'The exact data-element-id value from the HTML. Primary key for the entire pipeline.',
            },
            type: {
              type: 'string',
              enum: [
                'button', 'submit-button', 'icon-button',
                'text-input', 'password-input', 'number-input',
                'select', 'checkbox', 'textarea',
                'table', 'table-header-cell', 'table-data-cell',
                'table-editable-cell', 'table-selectable-cell',
                'modal', 'form', 'nav', 'tab', 'tab-group',
                'reactive-filter',
                'paragraph', 'heading', 'image', 'icon',
                'list', 'card', 'badge', 'link',
                'dropdown', 'file-upload',
                'container', 'section',
              ],
              description: 'Semantic component type. Use reactive-filter for live-search inputs.',
            },
            label: {
              type: 'string',
              description: 'UI label as shown in the boceto (Spanish). E.g. "Guardar", "Nuevo", "Legislación".',
            },
            props: {
              type: 'object',
              description: 'Component configuration. Add domain-specific props beyond the listed ones as needed.',
              properties: {
                placeholder: { type: 'string', description: 'Input placeholder (Spanish, as in boceto)' },
                icon: { type: 'string', description: 'Icon identifier: pencil, trash, gear, plus, download, upload, check, x' },
                variant: { type: 'string', enum: ['primary', 'secondary', 'danger', 'ghost', 'link'] },
                size: { type: 'string', enum: ['sm', 'md', 'lg'] },
                role_guard: {
                  type: 'array',
                  items: { type: 'string', enum: ['admin', 'profesor', 'tutor'] },
                  description: 'Roles that can see this element. Omit if all screen-level roles can see it.',
                },
                columns: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'For tables: column names in English, in display order.',
                },
                is_read_only: { type: 'boolean', description: 'True if the field/cell cannot be edited by the user.' },
                is_editable: { type: 'boolean', description: 'True if table cells can be edited inline.' },
                accepts: { type: 'string', description: 'For file-upload: accepted MIME types or extensions, e.g. ".csv,.xlsx"' },
                is_reactive: { type: 'boolean', description: 'True for live-search filters.' },
                debounce_ms: { type: 'integer', description: 'Debounce delay in ms for reactive filters. Always 300.' },
              },
              additionalProperties: true,
            },
            states: {
              type: 'array',
              minItems: 2,
              description: 'ALL visual/interactive states. Minimum: default + one variation. Be exhaustive.',
              items: {
                type: 'object',
                required: ['name', 'description', 'visual_cues'],
                properties: {
                  name: {
                    type: 'string',
                    description: 'State identifier: default | hover | focus | active | disabled | loading | error | empty | selected | partial | success',
                  },
                  description: { type: 'string', description: 'When this state occurs and what it communicates to the user.' },
                  visual_cues: {
                    type: 'array',
                    minItems: 1,
                    items: { type: 'string' },
                    description: 'Visible indicators: border colors, icons, opacity, text, cursor, animations.',
                  },
                  condition: { type: 'string', description: 'Condition that triggers this state, e.g. "when table has zero rows after filtering".' },
                },
              },
            },
            interactions: {
              type: 'array',
              description: 'ALL user-triggered interactions that cause any application state change.',
              items: {
                type: 'object',
                required: ['trigger', 'event', 'response'],
                properties: {
                  trigger: {
                    type: 'string',
                    description: 'DOM event: click | input | change | keypress:Enter | keypress:Escape | focus | blur | submit',
                  },
                  event: {
                    type: 'string',
                    description: 'Application event in kebab-case verb-noun, e.g. submit-login, filter-alumnos, open-create-alumno-modal.',
                  },
                  payload: {
                    type: 'object',
                    description: 'Data sent with the event. Map field names to their TypeScript-style types, e.g. { "username": "string", "year": "number" }.',
                    additionalProperties: true,
                  },
                  response: {
                    type: 'string',
                    description: 'What happens in the UI: navigation, modal opens/closes, list filtered, fields reset, score recalculated, etc.',
                  },
                  target_elements: {
                    type: 'array',
                    items: { type: 'integer' },
                    description: 'sketchNumbers of OTHER elements that visually change as a result of this interaction.',
                  },
                },
              },
            },
            accessibility: {
              type: 'object',
              description: 'ARIA and keyboard navigation attributes.',
              properties: {
                role: { type: 'string', description: 'ARIA role override, e.g. "dialog", "grid", "gridcell".' },
                aria_label: { type: 'string', description: 'Accessible label in English.' },
                aria_live: { type: 'string', enum: ['polite', 'assertive', 'off'], description: 'For live-updated regions (filters, scores).' },
                keyboard: { type: 'string', description: 'Keyboard interaction pattern, e.g. "Tab to focus, Enter/Space to activate, Escape to cancel".' },
              },
            },
            validation: {
              type: 'array',
              description: 'Validation rules for form inputs. Include ALL applicable rules.',
              items: {
                type: 'object',
                required: ['rule', 'message'],
                properties: {
                  rule: {
                    type: 'string',
                    description: 'Rule identifier: required | min:N | max:N | pattern:REGEX | unique | format:year | format:abbreviation | format:username',
                  },
                  message: { type: 'string', description: 'User-facing error message in English.' },
                  when: { type: 'string', description: 'Condition under which this rule applies.' },
                },
              },
            },
            depends_on: {
              type: 'array',
              items: { type: 'integer' },
              description: 'sketchNumbers of elements whose value/state this element reads or reacts to.',
            },
            note: {
              type: 'string',
              description: 'Analyst notes: deprecations, spec corrections, ambiguities, implementation caveats.',
            },
          },
        },
      },
      data_needs: {
        type: 'array',
        items: { type: 'string' },
        description: 'Domain entity types the screen must fetch from the API. E.g. ["Legislacion[]", "Ciclo[]", "Modulo[]", "Profesor (session)"].',
      },
      notes: {
        type: 'string',
        description: 'Screen-level analyst notes: layout ambiguities, design gaps, or implementation recommendations.',
      },
    },
  },
};

// ─── Route and role guard inference ──────────────────────────────────────────

const ROUTES = {
  'index.html': '/',
  'vista_admin-tab_legislacion_seleccionado.html': '/admin/legislacion',
  'vista_admin-tab_ciclos_seleccionado.html': '/admin/ciclos',
  'vista_admin-tab_modulos_seleccionado.html': '/admin/modulos',
  'vista_admin-tab_profesorado_seleccionado.html': '/admin/profesorado',
  'vista_profesor-landing.html': '/profesor',
  'vista_profesor_landing-gestionar_tab_Alumnos_seleccionado.html': '/profesor/gestionar/alumnos',
  'vista_profesor_landing-gestionar_tab_Proyectos_seleccionado.html': '/profesor/gestionar/proyectos',
  'vista_profesor_landing-gestionar_tab_Rubrica_seleccionado.html': '/profesor/gestionar/rubrica',
  'vista_profesor-landing-ver_notas.html': '/profesor/notas',
  'vista_profesor_landing-corregirProyecto.html': '/profesor/corregir',
};

function inferRoute(file) {
  return ROUTES[file] ?? `/${file.replace('.html', '')}`;
}

function inferRoleGuard(file) {
  if (file === 'index.html') return ['admin', 'profesor', 'tutor'];
  if (file.startsWith('vista_admin')) return ['admin'];
  return ['profesor', 'tutor'];
}

// ─── Core extraction logic ────────────────────────────────────────────────────

async function processScreen(client, screenDef, boceteElements) {
  const html = loadScreenHtml(screenDef.file);
  if (!html) return null;

  const elementRows = filterElementRows(boceteElements, screenDef.sketchNumbers);

  const userPrompt = `## Screen: ${screenDef.label}
File: ${screenDef.file}
Elements to document: #${screenDef.sketchNumbers.join(', #')} (${screenDef.sketchNumbers.length} total)

### Element registry for this screen:
| # | Elemento | Tipo | Descripción |
|---|----------|------|-------------|
${elementRows}

### Annotated HTML source:
\`\`\`html
${html}
\`\`\`

Call extract_screen_components with the complete UI specification for ALL ${screenDef.sketchNumbers.length} elements listed above (#${screenDef.sketchNumbers.join(', #')}). Every sketchNumber must appear in the output.`;

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },  // cached after first call, amortized across all 11 screens
      },
    ],
    tools: [EXTRACT_TOOL],
    tool_choice: { type: 'tool', name: 'extract_screen_components' },
    messages: [{ role: 'user', content: userPrompt }],
  });

  const toolBlock = response.content.find(b => b.type === 'tool_use');
  if (!toolBlock) {
    throw new Error(`No tool_use block returned for screen "${screenDef.label}". Response: ${JSON.stringify(response.content)}`);
  }

  return { result: toolBlock.input, usage: response.usage };
}

// ─── Public entry point ───────────────────────────────────────────────────────

export async function run({ featureId }) {
  const client = new Anthropic();

  console.log(`\n[designer-front] UI spec extraction — feature: ${featureId}`);
  console.log('[designer-front] Model:', MODEL);

  const metadata = loadBoceto(featureId);
  const boceteElements = loadBoceteElements();

  console.log(`[designer-front] ${metadata.screens.length} screens · ${metadata.totalElements} elements\n`);
  console.log('[designer-front] System prompt cached after first call (~4 000 tokens saved per screen)\n');

  const screens = [];
  const usageTotals = { input: 0, output: 0, cacheCreate: 0, cacheRead: 0 };

  for (let i = 0; i < metadata.screens.length; i++) {
    const screenDef = metadata.screens[i];
    const prefix = `  [${String(i + 1).padStart(2, '0')}/${metadata.screens.length}]`;
    process.stdout.write(`${prefix} ${screenDef.label}... `);

    const t0 = Date.now();
    const processed = await processScreen(client, screenDef, boceteElements);

    if (!processed) {
      console.log('SKIP (file not found)');
      continue;
    }

    const { result, usage } = processed;
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    usageTotals.input += usage.input_tokens ?? 0;
    usageTotals.output += usage.output_tokens ?? 0;
    usageTotals.cacheCreate += usage.cache_creation_input_tokens ?? 0;
    usageTotals.cacheRead += usage.cache_read_input_tokens ?? 0;

    const cacheLabel = usage.cache_read_input_tokens > 0
      ? ` · cache-hit ${usage.cache_read_input_tokens}tok`
      : ' · cache-miss (warming)';

    console.log(`✓ ${result.components.length} components · ${elapsed}s${cacheLabel}`);

    screens.push({
      screen_id: result.screen_id,
      screen_name: screenDef.label,
      file: screenDef.file,
      route: inferRoute(screenDef.file),
      role_guard: inferRoleGuard(screenDef.file),
      sketch_numbers: screenDef.sketchNumbers,
      components: result.components,
      data_needs: result.data_needs,
      notes: result.notes,
    });
  }

  const totalElements = screens.reduce((s, sc) => s + sc.components.length, 0);

  const output = {
    feature_id: featureId,
    version: 1,
    generated_at: new Date().toISOString(),
    agent: 'designer-front',
    model: MODEL,
    total_elements: totalElements,
    screens,
  };

  console.log(`\n[designer-front] Validating UISpecSchema...`);
  const validated = UISpecSchema.parse(output);

  const outputPath = saveArtifact('ui-spec.json', validated);

  console.log(`[designer-front] ✓ Artifact: ${outputPath}`);
  console.log(`[designer-front] ✓ Elements: ${totalElements} / ${metadata.totalElements} expected`);
  console.log(`[designer-front] ✓ Tokens — in: ${usageTotals.input} | out: ${usageTotals.output} | cache created: ${usageTotals.cacheCreate} | cache read: ${usageTotals.cacheRead}`);

  return validated;
}
