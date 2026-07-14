// Every corrector-* component uses attachShadow({mode:'open'}) — Shadow DOM
// encapsulates styles, so a <link>/<style> in index.html never reaches a
// shadow root. Tailwind classes have zero visual effect until the compiled
// CSS is injected into each shadow root directly via adoptedStyleSheets.
// One CSSStyleSheet is built lazily on first use and shared by every
// instance (~20 components) instead of parsing/duplicating the CSS string
// per instance — same "one shared instance" pattern as FormCascadeEngine.
let sheet: CSSStyleSheet | null = null;

function getSheet(): CSSStyleSheet {
  if (sheet) return sheet;
  sheet = new CSSStyleSheet();
  // dist/tailwind.css is compiled by `bunx tailwindcss` (see package.json's
  // "build" script) — fetched once and cached in the module-level sheet.
  fetch('/dist/tailwind.css')
    .then((res) => res.text())
    .then((css) => sheet!.replaceSync(css))
    .catch(() => {
      // Best-effort: if the stylesheet can't be fetched (e.g. dist/ not
      // built yet), components still render, just unstyled.
    });
  return sheet;
}

export function attachSharedStyles(shadowRoot: ShadowRoot): void {
  shadowRoot.adoptedStyleSheets = [getSheet()];
}
