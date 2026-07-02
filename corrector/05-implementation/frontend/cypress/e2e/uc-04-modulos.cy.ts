/// <reference types="cypress" />
// UC-04: Gestión de Módulos
// Elementos: #22 (tab), #23 (nombre), #24 (horas), #25 (legislación), #26 (año), #27 (ciclo),
//            #28 (Guardar), #29–#32 (filtros), #33 (tabla)

describe('UC-04: Gestión de Módulos', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-element-id="1"]').type('admin');
    cy.get('[data-element-id="2"]').type('Admin1234!');
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/admin');
    cy.get('[data-element-id="22"]').click();
    cy.url().should('include', '/admin/modulos');
  });

  // ── Flujo principal ──────────────────────────────────────────────────────────

  it('navigates to /admin/modulos on tab click and shows the modules table', () => {
    cy.get('[data-element-id="22"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-element-id="33"]').should('be.visible');
  });

  it('creates a module with all required fields and shows it in table #33', () => {
    cy.get('[data-element-id="23"]').type('Sistemas Operativos');
    cy.get('[data-element-id="24"]').clear().type('5');
    cy.get('[data-element-id="25"]').select('LOMLOE');
    cy.get('[data-element-id="26"]').select('2020');
    cy.get('[data-element-id="27"]').select('DAW');
    cy.get('[data-element-id="28"]').click();
    cy.get('[data-element-id="33"]').contains('Sistemas Operativos').should('be.visible');
  });

  // ── Flujo A1: cascada de selectores ─────────────────────────────────────────

  it('keeps selector #27 disabled until #25 and #26 have values', () => {
    cy.get('[data-element-id="27"]').should('be.disabled');
    cy.get('[data-element-id="25"]').select('LOMLOE');
    cy.get('[data-element-id="27"]').should('be.disabled');
    cy.get('[data-element-id="26"]').select('2020');
    cy.get('[data-element-id="27"]').should('not.be.disabled');
  });

  // ── Flujo A2: nombre duplicado en mismo ciclo ────────────────────────────────

  it('rejects a duplicate name+cycle+legislation combination', () => {
    cy.get('[data-element-id="23"]').type('DEW');
    cy.get('[data-element-id="24"]').clear().type('7');
    cy.get('[data-element-id="25"]').select('LOMLOE');
    cy.get('[data-element-id="26"]').select('2020');
    cy.get('[data-element-id="27"]').select('DAW');
    cy.get('[data-element-id="28"]').click();
    cy.contains(/ya existe|already exists|duplicado/i).should('be.visible');
  });

  // ── Flujo A4: borrado con proyectos ──────────────────────────────────────────

  it('blocks deletion of a module that has associated projects', () => {
    // ANA module has projects in the seed
    cy.get('[data-element-id="33"]').contains('ANA')
      .parents('tr').find('[data-action="delete"]').click();
    cy.contains(/proyectos|dependientes|eliminar primero/i).should('be.visible');
  });

  // ── Flujo A5: filtros ────────────────────────────────────────────────────────

  it('filters the modules table in real time by name (#32)', () => {
    cy.get('[data-element-id="32"]').type('DEW');
    cy.get('[data-element-id="33"]').find('tr').each(($row) => {
      cy.wrap($row).invoke('text').then((text) => {
        expect(text.toLowerCase()).to.include('dew');
      });
    });
  });

  // ── Validación horas semanales ───────────────────────────────────────────────

  it('shows error when weeklyHours is outside the 1–30 range', () => {
    cy.get('[data-element-id="23"]').type('Módulo Test');
    cy.get('[data-element-id="24"]').clear().type('99');
    cy.get('[data-element-id="25"]').select('LOMLOE');
    cy.get('[data-element-id="26"]').select('2020');
    cy.get('[data-element-id="27"]').select('DAW');
    cy.get('[data-element-id="28"]').click();
    cy.contains(/horas|rango|1.*30/i).should('be.visible');
  });
});
