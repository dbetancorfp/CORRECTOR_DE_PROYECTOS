import { html } from 'lit-html';
import type { TemplateResult } from 'lit-html';

// Shared nav + 4-tab bar markup for Admin screens. Not a custom element on
// purpose — a second Shadow DOM boundary nested inside corrector-*-form's own
// shadow root would break the flat `el.shadowRoot!.querySelector(...)` lookup
// every unit test (and eventually Cypress) relies on. This is a plain
// template function rendered directly into the caller's own shadow root
// instead, extracted once real duplication appeared between
// corrector-legislation-form and corrector-cycles-form.
export type AdminTab = 'legislacion' | 'ciclos' | 'modulos' | 'profesorado';

const TAB_LABELS: Record<AdminTab, string> = {
  legislacion: 'Legislación',
  ciclos: 'Ciclos',
  modulos: 'Módulos',
  profesorado: 'Profesorado',
};

// sketchNumber of each tab's own "active tab" button, per screen (only set
// for screens that exist). null = screen not implemented yet, tab renders
// disabled with no data-element-id.
const TAB_ELEMENT_IDS: Record<AdminTab, number | null> = {
  legislacion: 4,
  ciclos: 12,
  modulos: 22,
  profesorado: null,
};

export const ADMIN_TAB_PATHS: Record<AdminTab, string> = {
  legislacion: '/admin/legislacion',
  ciclos: '/admin/ciclos',
  modulos: '/admin/modulos',
  profesorado: '/admin/profesorado',
};

const TAB_ORDER: AdminTab[] = ['legislacion', 'ciclos', 'modulos', 'profesorado'];

export function renderAdminNav(
  activeTab: AdminTab,
  onLogout: () => void,
  onNavigate: (tab: AdminTab) => void,
): TemplateResult {
  return html`
    <nav>
      <span>Corrector de proyectos</span>
      <button data-action="logout" @click=${onLogout}>Salir</button>
    </nav>
    <div class="tabs">
      ${TAB_ORDER.map((tab) => {
        const elementId = TAB_ELEMENT_IDS[tab];
        if (tab === activeTab) {
          return html`<button data-element-id=${elementId ?? ''} role="tab" aria-selected="true">${TAB_LABELS[tab]}</button>`;
        }
        if (elementId === null) {
          return html`<button role="tab" aria-selected="false" disabled>${TAB_LABELS[tab]}</button>`;
        }
        return html`<button role="tab" aria-selected="false" @click=${() => onNavigate(tab)}>${TAB_LABELS[tab]}</button>`;
      })}
    </div>
  `;
}
