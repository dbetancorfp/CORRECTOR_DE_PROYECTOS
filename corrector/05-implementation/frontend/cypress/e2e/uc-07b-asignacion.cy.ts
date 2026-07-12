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
    // Several tests assign students to project 1/2 via the real API against a
    // real (non-reset-between-tests) Postgres instance. Without cleanup, an
    // earlier test in this file leaves those projects at/near the 3-student
    // cap, causing later tests' own setup POSTs to fail with 409.
    for (const projectId of [1, 2]) {
      for (const studentId of [1, 2, 3, 4, 5]) {
        cy.request({ method: 'DELETE', url: `/api/projects/${projectId}/students/${studentId}`, failOnStatusCode: false });
      }
    }
    // "Gestionar" lands on the Alumnos tab first; Asignación is a 3rd click.
    cy.get('[data-action="navigate-gestionar"]').click();
    cy.get('[data-action="tab-asignacion"]').click();
    cy.url().should('include', '/profesor/gestionar/asignacion');
    cy.get('[data-element-id="85"]').should('be.visible');
  });

  // ── Flujo principal ──────────────────────────────────────────────────────────

  it('assigns a student to a project and updates panel #84 without reload', () => {
    // Select a project from table #85 (thead has its own <tr>, so scope to tbody)
    cy.get('[data-element-id="85"]').find('tbody tr').first().click();
    cy.get('[data-element-id="83"]').invoke('text').should('not.be.empty');
    // Select a candidate in panel #84
    cy.get('[data-element-id="84"]').find('[data-student]').first().click();
    cy.get('[data-element-id="121"]').should('not.be.disabled');
    cy.get('[data-element-id="121"]').click();
    // Assigned students move from the candidate list into the "assigned" list
    // in #84 (with a Quitar button) — #85 itself never gains a column for this.
    cy.get('[data-element-id="84"]').find('[data-action="unassign"]').should('have.length.gte', 1);
  });

  it('updates panel #83 and candidates #84 reactively when a project row is clicked', () => {
    cy.get('[data-element-id="85"]').find('tbody tr').first().click();
    cy.get('[data-element-id="83"]').invoke('text').should('not.be.empty');
    cy.get('[data-element-id="84"]').should('be.visible');
  });

  // ── Flujo A1: botón #121 deshabilitado sin selección ────────────────────────

  it('disables button #121 when no project is selected in #83', () => {
    cy.get('[data-element-id="121"]').should('be.disabled');
  });

  it('disables button #121 when no student is selected in #84', () => {
    cy.get('[data-element-id="85"]').find('tbody tr').first().click();
    cy.get('[data-element-id="83"]').invoke('text').should('not.be.empty');
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
    cy.get('[data-element-id="85"]').should('be.visible');
    cy.get('[data-element-id="85"]').contains('tbody tr', 'Test Project').click();
    cy.get('[data-element-id="84"]').find('[data-student]').first().click();
    cy.get('[data-element-id="121"]').click();
    cy.contains(/límite|máximo|3 alumnos/i).should('be.visible');
  });

  // ── Flujo A3: alumno ya en otro proyecto (mismo año) ─────────────────────────

  it('shows error when student is already in another project for the same academic year', () => {
    // Student 1 is in project 1 → try to add to project 2 ("Project B")
    cy.request('POST', '/api/projects/1/students', { studentIds: [1] });
    cy.reload();
    cy.get('[data-element-id="85"]').should('be.visible');
    cy.get('[data-element-id="85"]').contains('tbody tr', 'Project B').click();
    cy.get('[data-element-id="84"]').find('[data-student="1"]').click();
    cy.get('[data-element-id="121"]').click();
    cy.contains(/año|otro proyecto|conflicto/i).should('be.visible');
  });

  // ── Flujo A4: desasignación ──────────────────────────────────────────────────

  it('unassigns a student via the Quitar button in panel #84', () => {
    cy.request('POST', '/api/projects/1/students', { studentIds: [1] });
    cy.reload();
    cy.get('[data-element-id="85"]').should('be.visible');
    // "Quitar" lives next to the assigned student's name inside panel #84,
    // not inside table #85 — #85's rows are projects, not assignments (user
    // decision 2026-07-12: Editar/Borrar on #85 act on the project itself).
    cy.get('[data-element-id="85"]').contains('tbody tr', 'Test Project').click();
    cy.get('[data-element-id="84"]').contains('JJ499').should('be.visible');
    // Only one student is assigned in this scenario, so the single Quitar
    // button unambiguously belongs to JJ499 — no DOM-nesting assumption needed.
    cy.get('[data-element-id="84"]').find('[data-action="unassign"]').should('have.length', 1).click();
    // Unassigning doesn't remove JJ499 from the panel entirely — they move
    // from the "assigned" list (Quitar button) back into the candidate pool
    // (a checkbox), since they're no longer assigned to any project.
    cy.get('[data-element-id="84"]').find('[data-action="unassign"]').should('not.exist');
    cy.get('[data-element-id="84"]').find('[data-student="1"]').should('exist');
  });
});
