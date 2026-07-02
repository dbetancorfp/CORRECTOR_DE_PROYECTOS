/// <reference types="cypress" />
// UC-08: Gestión de Rúbrica
// Elementos: #86 (filtro módulo), #87–#90 (cascada), #91 (Nuevo nivel), #92 (builder ítem),
//            #93 (descripción), #94 (Excelente), #95 (Bien), #96 (Mal), #97 (eliminar ítem),
//            #98 (Añadir ítem), #99 (Subir rúbrica), #100 (tabla rúbrica)

describe('UC-08: Gestión de Rúbrica', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-element-id="1"]').type('dbetqui');
    cy.get('[data-element-id="2"]').type('correctpass');
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/profesor');
    cy.contains(/Gestionar|rúbrica/i).click();
    cy.get('[data-element-id="100"]').should('be.visible');
  });

  // ── Flujo principal ──────────────────────────────────────────────────────────

  it('loads the existing rubric items in table #100 after selecting a module', () => {
    cy.get('[data-element-id="87"]').select('2020');
    cy.get('[data-element-id="88"]').select('LOMLOE');
    cy.get('[data-element-id="89"]').select('DAW');
    cy.get('[data-element-id="90"]').select('DEW');
    cy.get('[data-element-id="100"]').find('tr').should('have.length.gte', 1);
  });

  it('adds a rubric item when builder is complete and Excelente sum ≤ 10', () => {
    cy.get('[data-element-id="87"]').select('2020');
    cy.get('[data-element-id="88"]').select('LOMLOE');
    cy.get('[data-element-id="89"]').select('DAW');
    cy.get('[data-element-id="90"]').select('DEW');

    cy.get('[data-element-id="93"]').type('Documentación del proyecto');
    cy.get('[data-element-id="94"]').clear().type('2.0'); // Excelente (sum was 6, now 8 ≤ 10)
    cy.get('[data-element-id="95"]').clear().type('1.0'); // Bien
    // Mal (#96) stays at 0
    cy.get('[data-element-id="98"]').click();

    cy.get('[data-element-id="100"]').contains('Documentación del proyecto')
      .should('be.visible');
  });

  // ── Flujo A1: suma Excelente > 10 ───────────────────────────────────────────

  it('blocks adding an item when the Excelente sum would exceed 10', () => {
    cy.get('[data-element-id="87"]').select('2020');
    cy.get('[data-element-id]["88"]').select('LOMLOE');
    cy.get('[data-element-id="89"]').select('DAW');
    cy.get('[data-element-id="90"]').select('DEW');

    cy.get('[data-element-id="93"]').type('Ítem que supera límite');
    cy.get('[data-element-id="94"]').clear().type('5.0'); // Would push total > 10 (6+5=11)
    cy.get('[data-element-id="95"]').clear().type('2.0');
    cy.get('[data-element-id="98"]').click();

    cy.contains(/suma|excelente|límite|10/i).should('be.visible');
    cy.get('[data-element-id="100"]').contains('Ítem que supera límite')
      .should('not.exist');
  });

  // ── Flujo A2: Mal siempre 0 ─────────────────────────────────────────────────

  it('forces Mal (#96) value to 0 and does not allow editing', () => {
    cy.get('[data-element-id="96"]').should(($el) => {
      const val = $el.val() ?? $el.text();
      expect(String(val)).to.eq('0');
    });
    cy.get('[data-element-id="96"]').then(($el) => {
      if ($el.is('input')) {
        cy.wrap($el).should('be.disabled').or('have.attr', 'readonly');
      } else {
        cy.wrap($el).should('contain', '0');
      }
    });
  });

  // ── Flujo A3: máximo 5 niveles ───────────────────────────────────────────────

  it('disables button #91 when an item already has 5 levels', () => {
    cy.get('[data-element-id="91"]').click(); // 4th level
    cy.get('[data-element-id="91"]').click(); // 5th level
    cy.get('[data-element-id="91"]').should('be.disabled');
  });

  // ── Flujo A7: rúbrica congelada ──────────────────────────────────────────────

  it('blocks adding, editing and deleting items when rubric is frozen', () => {
    // Create a correction to freeze the rubric
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
    cy.contains(/Gestionar|rúbrica/i).click();
    cy.get('[data-element-id="87"]').select('2020');
    cy.get('[data-element-id="88"]').select('LOMLOE');
    cy.get('[data-element-id="89"]').select('DAW');
    cy.get('[data-element-id="90"]').select('DEW');
    cy.get('[data-element-id="98"]').should('be.disabled');
    cy.get('[data-element-id="97"]').should('be.disabled');
  });

  // ── Flujo A5: eliminar ítem en builder (no persistido) ──────────────────────

  it('removes an item from builder #92 without confirmation (not yet persisted)', () => {
    cy.get('[data-element-id="93"]').type('Ítem temporal');
    cy.get('[data-element-id="92"]').find('[data-action="remove-item"]').click();
    cy.get('[data-element-id="93"]').should('have.value', '');
  });
});
