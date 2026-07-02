/// <reference types="cypress" />
// UC-06: Gestión de Alumnos
// Elementos: #48 (nombre), #49 (año), #50 (legislación), #51 (ciclo), #52 (módulo),
//            #53 (Nuevo), #54 (Subir lista), #55–#59 (filtros), #60 (tabla)

describe('UC-06: Gestión de Alumnos', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-element-id="1"]').type('profesor1');
    cy.get('[data-element-id="2"]').type('12345678');
    cy.get('[data-element-id="3"]').click();
    // Handle first-login password change if needed
    cy.url().then((url) => {
      if (!url.includes('/profesor')) {
        cy.get('input[type="password"]').eq(1).type('NewPassword1!');
        cy.get('input[type="password"]').eq(2).type('NewPassword1!');
        cy.get('[data-element-id="3"]').click();
      }
    });
    cy.url().should('include', '/profesor');
    cy.contains(/Gestionar|alumnos/i).click();
    cy.get('[data-element-id="60"]').should('be.visible');
  });

  // ── Flujo principal ──────────────────────────────────────────────────────────

  it('creates a student with free-text name and shows them in table #60', () => {
    cy.get('[data-element-id="48"]').type('RR987');
    cy.get('[data-element-id="49"]').select('2020');
    cy.get('[data-element-id="50"]').select('LOMLOE');
    cy.get('[data-element-id="51"]').select('DAW');
    cy.get('[data-element-id="52"]').select('DEW');
    cy.get('[data-element-id="53"]').click();
    cy.get('[data-element-id="60"]').contains('RR987').should('be.visible');
  });

  it('accepts a real name with spaces', () => {
    cy.get('[data-element-id="48"]').type('María García');
    cy.get('[data-element-id="49"]').select('2020');
    cy.get('[data-element-id="50"]').select('LOMLOE');
    cy.get('[data-element-id="51"]').select('DAW');
    cy.get('[data-element-id="52"]').select('DEW');
    cy.get('[data-element-id="53"]').click();
    cy.get('[data-element-id="60"]').contains('María García').should('be.visible');
  });

  // ── Flujo A1: importación masiva ─────────────────────────────────────────────

  it('imports students from a valid CSV file and updates table #60', () => {
    const csvContent = 'nombre,año_inicio,legislacion,ciclo,modulo\nAA001,2020,LOMLOE,DAW,DEW\nBB002,2020,LOMLOE,DAW,DEW';
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const file = new File([blob], 'alumnos.csv', { type: 'text/csv' });

    cy.get('[data-element-id="54"]').then(($el) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      $el[0].dispatchEvent(new Event('change', { bubbles: true }));
    });
    cy.get('[data-element-id="60"]').contains('AA001').should('be.visible');
    cy.get('[data-element-id="60"]').contains('BB002').should('be.visible');
  });

  it('shows error toast and saves NO data when CSV has a missing required column', () => {
    const badCsv = 'nombre,año_inicio,legislacion,ciclo\nXX999,2020,LOMLOE,DAW'; // no 'modulo'
    const file = new File([badCsv], 'bad.csv', { type: 'text/csv' });

    cy.get('[data-element-id="54"]').then(($el) => {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      $el[0].dispatchEvent(new Event('change', { bubbles: true }));
    });
    cy.contains(/error|formato/i).should('be.visible');
    cy.get('[data-element-id="60"]').contains('XX999').should('not.exist');
  });

  // ── Flujo A3: borrado bloqueado si asignado a proyecto ───────────────────────

  it('blocks deletion of a student assigned to a project', () => {
    // Assign a student to a project via API, then try to delete
    cy.request('POST', '/api/projects/1/students', { studentIds: [1] });
    cy.reload();
    cy.contains(/Gestionar|alumnos/i).click();
    cy.get('[data-element-id="60"]').contains('tr', 'JJ499')
      .find('[data-action="delete"]').click();
    cy.contains(/asignado|proyecto/i).should('be.visible');
  });

  // ── Flujo A4: filtros reactivos ──────────────────────────────────────────────

  it('filters students table in real time when typing in the name filter (#55)', () => {
    cy.get('[data-element-id="55"]').type('JJ');
    cy.get('[data-element-id="60"]').find('tr').each(($row) => {
      cy.wrap($row).invoke('text').then((text) => {
        expect(text.toLowerCase()).to.include('jj');
      });
    });
  });

  // ── Nombre vacío ─────────────────────────────────────────────────────────────

  it('shows error when student name is empty on submit', () => {
    cy.get('[data-element-id="53"]').click();
    cy.contains(/nombre|requerido/i).should('be.visible');
  });
});
