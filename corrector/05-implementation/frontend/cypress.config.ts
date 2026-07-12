import { defineConfig } from 'cypress';

export default defineConfig({
  // Every corrector-* component renders into its own open Shadow DOM
  // (CLAUDE.md convention) — cy.get() doesn't pierce shadow roots unless
  // this is enabled, which is why every spec's very first cy.get() was
  // timing out even though the fields were visibly on the page.
  includeShadowDom: true,
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL ?? 'http://localhost:7777',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: false,
  },
});
