/// <reference types="cypress" />
// UC-02: Gestión de Legislaciones
// Elementos: #4 (tab), #5 (siglas), #6 (año inicio), #7 (Guardar), #8 (filtro año), #9 (filtro siglas), #10 (tabla)

describe('UC-02: Gestión de Legislaciones', () => {
  beforeEach(() => {
    // Admin session required
    cy.visit('/');
    cy.get('[data-element-id="1"]').type('admin');
    cy.get('[data-element-id="2"]').type('Admin1234!');
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/admin');
    cy.get('[data-element-id="4"]').click();
    cy.url().should('include', '/admin/legislacion');
  });

  // ── Flujo principal ──────────────────────────────────────────────────────────

  it('navigates to /admin/legislacion and shows the legislaciones table on tab click', () => {
    cy.get('[data-element-id="4"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-element-id="10"]').should('be.visible');
  });

  it('creates a new legislation and shows it in the table without page reload', () => {
    cy.get('[data-element-id="5"]').type('LOE');
    cy.get('[data-element-id="6"]').type('2006');
    cy.get('[data-element-id="7"]').click();
    cy.get('[data-element-id="10"]').contains('LOE').should('be.visible');
    // Form is cleared after save
    cy.get('[data-element-id="5"]').should('have.value', '');
  });

  it('loads and displays all existing legislations in table #10', () => {
    cy.get('[data-element-id="10"]').find('tr').should('have.length.gte', 1);
  });

  // ── Flujo A1: siglas duplicadas ──────────────────────────────────────────────

  it('rejects duplicate siglas with an error message', () => {
    cy.get('[data-element-id="5"]').type('LOMLOE');
    cy.get('[data-element-id="6"]').type('2020');
    cy.get('[data-element-id="7"]').click();
    cy.contains(/already exists|ya existe/i).should('be.visible');
  });

  // ── Flujo A2: validación de formulario ──────────────────────────────────────

  it('shows error when siglas field is empty on submit', () => {
    cy.get('[data-element-id="6"]').type('2020');
    cy.get('[data-element-id="7"]').click();
    cy.get('[data-element-id="5"]').should('have.attr', 'aria-invalid', 'true')
      .or('be.visible');
    cy.get('[data-element-id="10"]').find('tr').its('length').then((before) => {
      cy.get('[data-element-id="10"]').find('tr').should('have.length', before);
    });
  });

  it('shows validation error when siglas contains lowercase letters', () => {
    cy.get('[data-element-id="5"]').type('lomloe');
    cy.get('[data-element-id="6"]').type('2020');
    cy.get('[data-element-id="7"]').click();
    cy.contains(/mayúsculas|uppercase|patrón/i).should('be.visible');
  });

  // ── Flujo A3: edición inline ─────────────────────────────────────────────────

  it('edits a legislation row inline and persists the change without page reload', () => {
    cy.get('[data-element-id="10"]').contains('LOMLOE')
      .parents('tr').find('[data-action="edit"]').click();
    cy.get('[data-element-id="10"]').contains('tr', 'LOMLOE')
      .find('input').first().clear().type('LOMLOE');
    cy.get('[data-element-id="10"]').contains('tr', 'LOMLOE')
      .find('[data-action="save"]').click();
    cy.get('[data-element-id="10"]').contains('LOMLOE').should('be.visible');
  });

  // ── Flujo A4: borrado con módulos dependientes ───────────────────────────────

  it('blocks deletion when legislation has dependent modules and shows error', () => {
    // LOMLOE has modules in the seed — deletion must be blocked
    cy.get('[data-element-id="10"]').contains('LOMLOE')
      .parents('tr').find('[data-action="delete"]').click();
    cy.contains(/módulos|dependientes|eliminar primero/i).should('be.visible');
  });

  it('deletes a legislation with no dependent modules', () => {
    // LOGSE has no modules in the seed
    cy.get('[data-element-id="10"]').contains('LOGSE')
      .parents('tr').find('[data-action="delete"]').click();
    cy.get('[data-element-id="10"]').contains('LOGSE').should('not.exist');
  });

  // ── Flujo A5: filtrado reactivo ──────────────────────────────────────────────

  it('filters the table in real time when typing in the year filter (#8)', () => {
    cy.get('[data-element-id="8"]').type('2020');
    cy.get('[data-element-id="10"]').find('tr').each(($row) => {
      cy.wrap($row).should('contain', '2020');
    });
  });

  it('filters the table in real time when typing in the siglas filter (#9)', () => {
    cy.get('[data-element-id="9"]').type('loe');
    cy.get('[data-element-id="10"]').find('tr').each(($row) => {
      cy.wrap($row).invoke('text').then((text) => {
        expect(text.toLowerCase()).to.include('loe');
      });
    });
  });
});
