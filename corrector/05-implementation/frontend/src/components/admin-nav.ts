import { html } from 'lit-html';
import type { TemplateResult } from 'lit-html';
import { classesFor } from '../styles/classes-for';

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

// sketchNumber of each tab button. The boceto only tags a tab's id on that
// tab's own screen (e.g. #12 "Ciclos" only appears in
// vista_admin-tab_ciclos_seleccionado.html) — but since admin-nav.ts is our
// own shared infrastructure, not a literal per-screen reproduction, every
// tab carries its id everywhere it renders so it stays reachable regardless
// of which screen is currently active (needed for Cypress cross-screen
// navigation — a tab you can't yet click still needs to be findable to
// assert it's disabled). null = screen not implemented yet.
const TAB_ELEMENT_IDS: Record<AdminTab, number | null> = {
  legislacion: 4,
  ciclos: 12,
  modulos: 22,
  profesorado: 34,
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
    <nav class=${classesFor('nav')}>
      <span class="font-semibold text-gray-900">Corrector de proyectos</span>
      <button class=${classesFor('button', 'secondary', 'sm')} data-action="logout" @click=${onLogout}>Salir</button>
    </nav>
    <div class="tabs flex border-b border-gray-200 px-4">
      ${TAB_ORDER.map((tab) => {
        const elementId = TAB_ELEMENT_IDS[tab];
        const idAttr = elementId === null ? undefined : elementId;
        const tabClass = `px-4 py-2 ${classesFor('tab', tab === activeTab ? 'primary' : undefined)}`;
        if (tab === activeTab) {
          return html`<button class=${tabClass} data-element-id=${idAttr ?? ''} role="tab" aria-selected="true">${TAB_LABELS[tab]}</button>`;
        }
        if (elementId === null) {
          return html`<button class=${tabClass} role="tab" aria-selected="false" disabled>${TAB_LABELS[tab]}</button>`;
        }
        return html`<button class=${tabClass} data-element-id=${idAttr ?? ''} role="tab" aria-selected="false" @click=${() => onNavigate(tab)}>${TAB_LABELS[tab]}</button>`;
      })}
    </div>
  `;
}
