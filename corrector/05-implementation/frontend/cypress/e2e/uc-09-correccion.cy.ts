/// <reference types="cypress" />
// UC-09: Corrección de Proyecto
// Elementos: #101–#105 (cascada), #106 (Corregir por grupo), #107–#109 (alumnos),
//            #110 (tabla 5 niveles), #111 (tabla 3 niveles), #112 (nota bruta), #113 (nota normalizada)

describe('UC-09: Corrección de Proyecto', () => {
  beforeEach(() => {
    // Assign student 1 to project 1 before each test
    cy.request({
      method: 'POST',
      url: '/api/projects/1/students',
      body: { studentIds: [1] },
      failOnStatusCode: false,
    });

    cy.visit('/');
    cy.get('[data-element-id="1"]').type('dbetqui');
    cy.get('[data-element-id="2"]').type('correctpass');
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/profesor');
    cy.contains(/Corregir proyecto/i).click();

    // Fill in the cascade to reach the correction grid
    cy.get('[data-element-id="101"]').select('2020');
    cy.get('[data-element-id="102"]').select('LOMLOE');
    cy.get('[data-element-id="103"]').select('DAW');
    cy.get('[data-element-id="104"]').select('DEW');
    cy.get('[data-element-id="105"]').select('Test Project');
  });

  // ── Flujo principal ──────────────────────────────────────────────────────────

  it('loads the rubric in tables #110/#111 and student checkboxes after selecting a project', () => {
    cy.get('[data-element-id="110"]').should('be.visible');
    cy.get('[data-element-id="107"]').should('be.visible');
  });

  it('selects a level in a row and deselects the rest of the row', () => {
    cy.get('[data-element-id="110"]').find('tr').first()
      .find('[data-level]').first().click();
    cy.get('[data-element-id="110"]').find('tr').first()
      .find('[data-level]').first().should('have.attr', 'aria-selected', 'true');
    cy.get('[data-element-id="110"]').find('tr').first()
      .find('[data-level]').not(':first').each(($el) => {
        cy.wrap($el).should('not.have.attr', 'aria-selected', 'true');
      });
  });

  it('updates #112 and #113 immediately after a level selection', () => {
    cy.get('[data-element-id="112"]').invoke('text').then((before) => {
      cy.get('[data-element-id="110"]').find('tr').first()
        .find('[data-level]').first().click();
      cy.get('[data-element-id="112"]').invoke('text').should('not.eq', before);
    });
  });

  it('auto-saves correction when all items have a level selected (no save button needed)', () => {
    // Select a level for every item
    cy.get('[data-element-id="110"]').find('tr').each(($row) => {
      cy.wrap($row).find('[data-level]').first().click();
    });
    cy.get('[data-element-id="111"]').find('tr').each(($row) => {
      cy.wrap($row).find('[data-level]').first().click();
    });
    // Screen stays active — project selector still visible
    cy.get('[data-element-id="105"]').should('be.visible');
    // Correction persisted in API
    cy.request('GET', '/api/corrections?studentId=1&projectId=1').then((resp) => {
      expect(resp.body).to.not.be.null;
      expect(resp.body.finalScore).to.be.a('number');
    });
  });

  // ── Flujo A1: corrección existente pre-cargada ──────────────────────────────

  it('pre-selects cells from a previous correction when one exists', () => {
    // Create a correction via API
    cy.request('POST', '/api/corrections', {
      studentId: 1,
      projectId: 1,
      moduleId: 1,
      rubricId: 1,
      academicYear: '2024-2025',
      items: [
        { rubricItemId: 1, rubricLevelId: 1 },
        { rubricItemId: 2, rubricLevelId: 4 },
      ],
    });
    cy.reload();
    cy.contains(/Corregir proyecto/i).click();
    cy.get('[data-element-id="101"]').select('2020');
    cy.get('[data-element-id="102"]').select('LOMLOE');
    cy.get('[data-element-id="103"]').select('DAW');
    cy.get('[data-element-id="104"]').select('DEW');
    cy.get('[data-element-id="105"]').select('Test Project');

    cy.get('[data-element-id="110"]').find('[aria-selected="true"]')
      .should('have.length.gte', 1);
  });

  // ── Flujo A2: módulo sin rúbrica ────────────────────────────────────────────

  it('shows a warning and does not load the rubric tables when module has no rubric', () => {
    cy.get('[data-element-id="104"]').select('ANA'); // ANA has no rubric in the seed
    cy.contains(/sin rúbrica|no tiene rúbrica/i).should('be.visible');
    cy.get('[data-element-id="110"]').should('not.exist').or('be.empty');
  });

  // ── Flujo A modo grupo (#106) ─────────────────────────────────────────────────

  it('disables individual checkboxes #107–#109 when group mode #106 is checked', () => {
    cy.get('[data-element-id="106"]').check();
    cy.get('[data-element-id="107"]').should('be.disabled');
    cy.get('[data-element-id="108"]').should('be.disabled');
  });

  // ── Cálculo de nota ─────────────────────────────────────────────────────────

  it('calculates final_score as (selected_sum / max_sum) × 10 rounded to 2 decimals', () => {
    // Select Excelente for all items (max score)
    cy.get('[data-element-id="110"]').find('tr').each(($row) => {
      cy.wrap($row).find('[data-level="Excelente"]').click();
    });
    // With all Excelente: finalScore should be 10.00
    cy.get('[data-element-id="113"]').invoke('text').then((text) => {
      const score = parseFloat(text);
      expect(score).to.be.closeTo(10, 0.01);
    });
  });
});
