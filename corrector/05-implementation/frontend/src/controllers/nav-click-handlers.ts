export interface NavClickHandlers<Tab extends string> {
  handleLogoutClick: () => void;
  handleNavigateClick: (tab: Tab) => void;
}

// The logout + cross-screen-navigate dispatch pair is identical across every
// screen that renders a nav bar (admin-nav.ts or gestion-nav.ts) — only the
// navigate event name and the tab→path table differ. One shared instance per
// screen (same pattern as FormCascadeEngine), not a call site each screen
// repeats with its own config object.
export function makeNavClickHandlers<Tab extends string>(
  el: HTMLElement,
  navigateEventName: string,
  tabPaths: Record<Tab, string>,
): NavClickHandlers<Tab> {
  return {
    handleLogoutClick: (): void => {
      el.dispatchEvent(new CustomEvent('corrector:logout', { bubbles: true, composed: true }));
    },
    handleNavigateClick: (tab: Tab): void => {
      el.dispatchEvent(new CustomEvent(navigateEventName, {
        bubbles: true,
        composed: true,
        detail: { to: tabPaths[tab] },
      }));
    },
  };
}
