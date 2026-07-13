import { html, nothing } from 'lit-html';
import type { TemplateResult } from 'lit-html';

// Every cascade/filter <select> across the CRUD screens (Alumnos, Proyectos,
// Profesorado, Ciclos, Módulos, Rúbrica, Corregir, Asignación) renders the
// same shape — a placeholder option + one <option> per item, with the
// current value pre-selected — even though the screens differ in how many
// cascade levels they have and what order they're in. Extracted once that
// markup showed up as real SonarCloud duplication (not just superficial
// similarity) across all 8 files.
export interface OptionSelectProps<T> {
  sketchNumber: number;
  options: T[];
  getId: (item: T) => number;
  getLabel: (item: T) => string;
  selectedValue: string;
  placeholder: string;
  onChange: (e: Event) => void;
  disabled?: boolean;
  invalid?: boolean;
}

export function renderOptionSelect<T>(props: OptionSelectProps<T>): TemplateResult {
  return html`
    <select
      data-element-id=${props.sketchNumber}
      ?disabled=${props.disabled ?? false}
      aria-invalid=${props.invalid === undefined ? nothing : (props.invalid ? 'true' : 'false')}
      @change=${props.onChange}
    >
      <option value="">${props.placeholder}</option>
      ${props.options.map((item) => html`<option value=${props.getId(item)} ?selected=${String(props.getId(item)) === props.selectedValue}>${props.getLabel(item)}</option>`)}
    </select>
  `;
}
