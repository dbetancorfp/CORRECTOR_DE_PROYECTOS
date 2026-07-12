import { html } from 'lit-html';
import type { TemplateResult } from 'lit-html';

// Shared nav + 4-tab bar for the Profesor "Gestionar" screens. Same reasoning
// as admin-nav.ts: a plain template function rendered into the caller's own
// shadow root, not a nested custom element — extracted once Proyectos (2nd
// tab) duplicated the block corrector-students-form.ts already had.
export type GestionTab = 'alumnos' | 'proyectos' | 'asignacion' | 'rubrica';

const TAB_LABELS: Record<GestionTab, string> = {
  alumnos: 'Alumnos',
  proyectos: 'Proyectos',
  asignacion: 'Asignación Proyecto-Alumno',
  rubrica: 'Rúbrica',
};

export const GESTION_TAB_PATHS: Record<GestionTab, string> = {
  alumnos: '/profesor/gestionar/alumnos',
  proyectos: '/profesor/gestionar/proyectos',
  asignacion: '/profesor/gestionar/asignacion',
  rubrica: '/profesor/gestionar/rubrica',
};

// Tab buttons carry no sketchNumber — the boceto doesn't annotate them (see
// ui-spec.json notes on screen-profesor-alumnos / screen-profesor-proyectos:
// "Tab navigation buttons are not annotated in boceto"). null = screen not
// implemented yet, renders disabled.
const TAB_IMPLEMENTED: Record<GestionTab, boolean> = {
  alumnos: true,
  proyectos: true,
  asignacion: true,
  rubrica: false,
};

const TAB_ORDER: GestionTab[] = ['alumnos', 'proyectos', 'asignacion', 'rubrica'];

export function renderGestionNav(
  activeTab: GestionTab,
  onLogout: () => void,
  onNavigate: (tab: GestionTab) => void,
): TemplateResult {
  return html`
    <nav>
      <span>Corrector de proyectos</span>
      <button data-action="logout" @click=${onLogout}>Salir</button>
    </nav>
    <h2>Gestión</h2>
    <div class="tabs">
      ${TAB_ORDER.map((tab) => {
        const dataAction = `tab-${tab}`;
        if (tab === activeTab) {
          return html`<button data-action=${dataAction} role="tab" aria-selected="true">${TAB_LABELS[tab]}</button>`;
        }
        if (!TAB_IMPLEMENTED[tab]) {
          return html`<button data-action=${dataAction} role="tab" aria-selected="false" disabled>${TAB_LABELS[tab]}</button>`;
        }
        return html`<button data-action=${dataAction} role="tab" aria-selected="false" @click=${() => onNavigate(tab)}>${TAB_LABELS[tab]}</button>`;
      })}
    </div>
  `;
}
