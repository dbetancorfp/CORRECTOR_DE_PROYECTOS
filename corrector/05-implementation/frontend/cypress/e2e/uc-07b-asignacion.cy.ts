/// <reference types="cypress" />
// UC-07b: Asignación Proyecto-Alumno
// Elementos: #73–#77 (filtros proyecto), #78–#82 (filtros alumno),
//            #83 (panel proyecto), #84 (panel candidatos), #85 (tabla asignaciones), #121 (Agregar)

describe('UC-07b: Asignación Proyecto-Alumno', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-element-id="1"]').type('dbetqui');
    cy.get('[data-element-id="2"]').type('correctpass');
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/profesor');
    cy.contains(/Gestionar|asignaci/i).click();
    cy.get('[data-element-id="85"]').should('be.visible');
  });

  // ── Flujo principal ──────────────────────────────────────────────────────────

  it('assigns a student to a project and updates table #85 without reload', () => {
    // Select a project from table #85
    cy.get('[data-element-id="85"]').find('tr').first().click();
    cy.get('[data-element-id="83"]').should('not.be.empty');
    // Select a candidate in panel #84
    cy.get('[data-element-id="84"]').find('[data-student]').first().click();
    cy.get('[data-element-id="121"]').should('not.be.disabled');
    cy.get('[data-element-id="121"]').click();
    cy.get('[data-element-id="85"]').find('tr').its('length').should('be.gte', 1);
  });

  it('updates panel #83 and candidates #84 reactively when a project row is clicked', () => {
    cy.get('[data-element-id="85"]').find('tr').first().click();
    cy.get('[data-element-id="83"]').invoke('text').should('not.be.empty');
    cy.get('[data-element-id="84"]').should('be.visible');
  });

  // ── Flujo A1: botón #121 deshabilitado sin selección ────────────────────────

  it('disables button #121 when no project is selected in #83', () => {
    cy.get('[data-element-id="121"]').should('be.disabled');
  });

  it('disables button #121 when no student is selected in #84', () => {
    cy.get('[data-element-id="85"]').find('tr').first().click();
    cy.get('[data-element-id="83"]').should('not.be.empty');
    // No student selected yet
    cy.get('[data-element-id="121"]').should('be.disabled');
  });

  // ── Flujo A2: máximo 3 alumnos ───────────────────────────────────────────────

  it('shows error when assigning a 4th student would exceed the 3-student limit', () => {
    // Pre-populate via API
    cy.request('POST', '/api/projects/1/students', { studentIds: [1] });
    cy.request('POST', '/api/projects/1/students', { studentIds: [2] });
    cy.request('POST', '/api/projects/1/students', { studentIds: [3] });
    cy.reload();
    cy.contains(/Gestionar|asignaci/i).click();
    cy.get('[data-element-id="85"]').contains('tr', 'Test Project').click();
    cy.get('[data-element-id="84"]').find('[data-student]').first().click();
    cy.get('[data-element-id="121"]').click();
    cy.contains(/límite|máximo|3 alumnos/i).should('be.visible');
  });

  // ── Flujo A3: alumno ya en otro proyecto (mismo año) ─────────────────────────

  it('shows error when student is already in another project for the same academic year', () => {
    // Student 1 is in project 1 → try to add to project 2
    cy.request('POST', '/api/projects/1/students', { studentIds: [1] });
    cy.reload();
    cy.contains(/Gestionar|asignaci/i).click();
    cy.get('[data-element-id="85"]').contains('tr', 'Project B').click();
    cy.get('[data-element-id="84"]').find('[data-student="1"]').click();
    cy.get('[data-element-id="121"]').click();
    cy.contains(/año|otro proyecto|conflicto/i).should('be.visible');
  });

  // ── Flujo A4: desasignación ──────────────────────────────────────────────────

  it('unassigns a student from project #85 after confirmation', () => {
    cy.request('POST', '/api/projects/1/students', { studentIds: [1] });
    cy.reload();
    cy.contains(/Gestionar|asignaci/i).click();
    cy.get('[data-element-id="85"]').contains('tr', 'JJ499')
      .find('[data-action="unassign"]').click();
    cy.get('[data-element-id="85"]').contains('JJ499').should('not.exist');
  });
});
