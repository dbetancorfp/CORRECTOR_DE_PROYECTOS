/// <reference types="cypress" />
// UC-09: Corrección de Proyecto
// Elementos: #101–#105 (cascada), #106 (Corregir por grupo), #107–#109 (alumnos),
//            #110 (tabla de corrección — columnas dinámicas; #111 no se renderiza
//            como tabla separada, ver corrector-correction-form.ts), #112 (nota
//            bruta), #113 (nota normalizada)

describe('UC-09: Corrección de Proyecto', () => {
  const NEW_PASSWORD = 'NewPassword1!';
  // A student can only be in one project per academic year
  // (trg_project_student_year). Every test creates its own project with the
  // same academic_year (2024-2025, matching the seeded rubric) and assigns
  // student 1 to it — without unassigning from the PREVIOUS test's project
  // first, every assignment after the first one silently conflicts and
  // never actually happens, leaving #107-#109 unrendered two tests later.
  const createdProjectIds: number[] = [];

  // POST /api/corrections requires the authenticated teacher to be assigned
  // to the module (teacher_module) unless they're admin. dbetqui (tutor,
  // used by every other uc-0X spec) has no assignment to DEW — the only
  // module with a seeded rubric — and would 403. profesor1 IS assigned to
  // DEW, but requires a password change on first login; done once here
  // (same flow already proven in uc-01-login.cy.ts) so every beforeEach can
  // just log in normally afterward.
  before(() => {
    cy.visit('/');
    cy.get('[data-element-id="1"]').type('profesor1');
    cy.get('[data-element-id="2"]').type('12345678');
    cy.get('[data-element-id="3"]').click();
    cy.get('input[type="password"]').eq(1).type(NEW_PASSWORD);
    cy.get('input[type="password"]').eq(2).type(NEW_PASSWORD);
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/profesor');
  });

  beforeEach(() => {
    // The fixture's "Test Project" belongs to module ANA (id 2), which has
    // no seeded rubric — DEW (id 1) is the only module with one. Creating
    // our own project under DEW (matching the seeded rubric's real
    // academic_year, 2024-2025 — the screen resolves the rubric from the
    // selected PROJECT's own academicYear field, not the #101 cascade year;
    // see corrector-correction-form.ts's design note) avoids depending on a
    // fixture relationship the original spec assumed incorrectly.
    createdProjectIds.forEach((id) => {
      cy.request({ method: 'DELETE', url: `/api/projects/${id}/students/1`, failOnStatusCode: false });
    });
    cy.request('POST', '/api/projects', { name: 'Proyecto UC-09', academicYear: '2024-2025', moduleId: 1 })
      .then((resp) => {
        const projectId = resp.body.id as number;
        createdProjectIds.push(projectId);
        cy.wrap(projectId).as('projectId');
        return cy.request({ method: 'POST', url: `/api/projects/${projectId}/students`, body: { studentIds: [1] } });
      });

    cy.visit('/');
    cy.get('[data-element-id="1"]').type('profesor1');
    cy.get('[data-element-id="2"]').type(NEW_PASSWORD);
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/profesor');
    cy.get('[data-action="navigate-corregir"]').click();
    cy.url().should('include', '/profesor/corregir');

    // Fill in the cascade to reach the correction grid
    cy.get('[data-element-id="101"]').select('2020');
    cy.get('[data-element-id="102"]').select('LOMLOE');
    cy.get('[data-element-id="103"]').select('DAW');
    cy.get('[data-element-id="104"]').select('DEW');
    cy.get('@projectId').then((projectId) => {
      cy.get('[data-element-id="105"]').select(String(projectId));
    });
  });

  // ── Flujo principal ──────────────────────────────────────────────────────────

  it('loads the rubric in table #110 and student checkboxes after selecting a project', () => {
    cy.get('[data-element-id="110"]').should('be.visible');
    cy.get('[data-element-id="107"]').should('be.visible');
  });

  it('selects a level in a row and deselects the rest of the row', () => {
    // #110 has no <thead>/<tbody> split, so row 0 is the header — the first
    // item row is index 1.
    cy.get('[data-element-id="110"]').find('tr').eq(1)
      .find('[data-level]').first().click();
    cy.get('[data-element-id="110"]').find('tr').eq(1)
      .find('[data-level]').first().should('have.attr', 'aria-selected', 'true');
    cy.get('[data-element-id="110"]').find('tr').eq(1)
      .find('[data-level]').not(':first').each(($el) => {
        cy.wrap($el).should('have.attr', 'aria-selected', 'false');
      });
  });

  it('updates #112 and #113 immediately after a level selection', () => {
    cy.get('[data-element-id="112"]').invoke('text').then((before) => {
      cy.get('[data-element-id="110"]').find('tr').eq(1)
        .find('[data-level]').first().click();
      cy.get('[data-element-id="112"]').invoke('text').should('not.eq', before);
    });
  });

  it('auto-saves correction when all items have a level selected (no save button needed)', () => {
    // Auto-save also needs a target student — checking one of #107-#109 (or
    // group mode #106) — selecting rubric cells alone never has anyone to
    // save the correction for (see _maybeAutoSave in corrector-correction-form.ts).
    cy.get('[data-element-id="107"]').check();
    // Select a level for every item row (skip the header row).
    cy.get('[data-element-id="110"]').find('tr').not(':first').each(($row) => {
      cy.wrap($row).find('[data-level]').first().click();
    });
    // Screen stays active — project selector still visible
    cy.get('[data-element-id="105"]').should('be.visible');
    // Correction persisted in API
    cy.get('@projectId').then((projectId) => {
      cy.request('GET', `/api/corrections?studentId=1&projectId=${projectId}`).then((resp) => {
        expect(resp.body).to.not.be.null;
        expect(resp.body.finalScore).to.be.a('number');
      });
    });
  });

  // ── Flujo A1: corrección existente pre-cargada ──────────────────────────────

  it('pre-selects cells from a previous correction when one exists', () => {
    cy.get('@projectId').then((projectId) => {
      cy.request('POST', '/api/corrections', {
        studentId: 1,
        projectId,
        moduleId: 1,
        rubricId: 1,
        academicYear: '2024-2025',
        items: [
          { rubricItemId: 1, rubricLevelId: 1 },
          { rubricItemId: 2, rubricLevelId: 4 },
        ],
      });
    });
    // #101-#105's cascade is pure client-side state, not persisted — a full
    // page reload clears it, so it needs redoing (same as the beforeEach).
    cy.reload();
    cy.get('[data-element-id="101"]').select('2020');
    cy.get('[data-element-id="102"]').select('LOMLOE');
    cy.get('[data-element-id="103"]').select('DAW');
    cy.get('[data-element-id="104"]').select('DEW');
    cy.get('@projectId').then((projectId) => {
      cy.get('[data-element-id="105"]').select(String(projectId));
    });
    cy.get('[data-element-id="110"]').should('be.visible');
    // Pre-loading only happens once exactly one student checkbox is checked
    // (see corrector-correction-form.ts: ambiguous otherwise).
    cy.get('[data-element-id="107"]').check();

    cy.get('[data-element-id="110"]').find('[aria-selected="true"]')
      .should('have.length.gte', 1);
  });

  // ── Flujo A2: proyecto sin rúbrica ───────────────────────────────────────────

  it('shows a warning and does not load the rubric table when the selected project has no rubric', () => {
    // "Test Project" is the real fixture project under module ANA, which has
    // no seeded rubric.
    cy.get('[data-element-id="101"]').select('2020');
    cy.get('[data-element-id="102"]').select('LOMLOE');
    cy.get('[data-element-id="103"]').select('DAW');
    cy.get('[data-element-id="104"]').select('ANA');
    cy.get('[data-element-id="105"]').select('Test Project');
    cy.contains(/sin rúbrica|no tiene rúbrica/i).should('be.visible');
    cy.get('[data-element-id="110"]').should('not.exist');
  });

  // ── Flujo A modo grupo (#106) ─────────────────────────────────────────────────

  it('disables individual checkbox #107 when group mode #106 is checked', () => {
    cy.get('[data-element-id="106"]').check();
    cy.get('[data-element-id="107"]').should('be.disabled');
  });

  // ── Cálculo de nota ─────────────────────────────────────────────────────────

  it('calculates final_score as (selected_sum / max_sum) × 10 rounded to 2 decimals', () => {
    // Select Excelente for every item row (max score)
    cy.get('[data-element-id="110"]').find('tr').not(':first').each(($row) => {
      cy.wrap($row).find('[data-level="Excelente"]').click();
    });
    // With all Excelente selected: finalScore should be 10.00
    cy.get('[data-element-id="113"]').invoke('text').then((text) => {
      const score = parseFloat(text);
      expect(score).to.be.closeTo(10, 0.01);
    });
  });
});
