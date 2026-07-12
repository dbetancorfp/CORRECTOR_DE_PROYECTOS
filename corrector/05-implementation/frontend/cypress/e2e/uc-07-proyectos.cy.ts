/// <reference types="cypress" />
// UC-07: Gestión de Proyectos
// Elementos: #61 (nombre), #62 (año), #63 (legislación), #64 (ciclo), #65 (módulo),
//            #66 (Nuevo), #67–#71 (filtros), #72 (tabla)

describe('UC-07: Gestión de Proyectos', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-element-id="1"]').type('dbetqui');
    cy.get('[data-element-id="2"]').type('correctpass');
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/profesor');
    // "Gestionar" lands on the Alumnos tab first; Proyectos is a second click.
    cy.get('[data-action="navigate-gestionar"]').click();
    cy.get('[data-action="tab-proyectos"]').click();
    cy.url().should('include', '/profesor/gestionar/proyectos');
    cy.get('[data-element-id="72"]').should('be.visible');
  });

  // ── Flujo principal ──────────────────────────────────────────────────────────

  it('creates a project and shows it in table #72 without page reload', () => {
    cy.get('[data-element-id="61"]').type('App Corrector v2');
    cy.get('[data-element-id="62"]').select('2020');
    cy.get('[data-element-id="63"]').select('LOMLOE');
    cy.get('[data-element-id="64"]').select('DAW');
    cy.get('[data-element-id="65"]').select('DEW');
    cy.get('[data-element-id="66"]').click();
    cy.get('[data-element-id="72"]').contains('App Corrector v2').should('be.visible');
    // Form is cleared after save
    cy.get('[data-element-id="61"]').should('have.value', '');
  });

  it('persists project with name and academicYear via API', () => {
    cy.get('[data-element-id="61"]').type('Proyecto API');
    cy.get('[data-element-id="62"]').select('2020');
    cy.get('[data-element-id="63"]').select('LOMLOE');
    cy.get('[data-element-id="64"]').select('DAW');
    cy.get('[data-element-id="65"]').select('DEW');
    cy.get('[data-element-id="66"]').click();
    cy.request('GET', '/api/projects').then((resp) => {
      const project = (resp.body as Array<{ name: string; academicYear: string }>)
        .find((p) => p.name === 'Proyecto API');
      expect(project).to.exist;
      expect(project!.academicYear).to.match(/^\d{4}-\d{4}$/);
    });
  });

  // ── Flujo A1: cascada de selectores ─────────────────────────────────────────

  it('cascades selectors so #65 is disabled until #62, #63 and #64 are set', () => {
    cy.get('[data-element-id="65"]').should('be.disabled');
    cy.get('[data-element-id="62"]').select('2020');
    cy.get('[data-element-id="63"]').select('LOMLOE');
    cy.get('[data-element-id="64"]').select('DAW');
    cy.get('[data-element-id="65"]').should('not.be.disabled');
  });

  // ── Flujo A3: borrado con alumnos asignados ──────────────────────────────────

  it('blocks deletion of a project that has assigned students', () => {
    // Project 1 has students assigned in setup
    cy.request('POST', '/api/projects/1/students', { studentIds: [1] });
    cy.reload();
    cy.get('[data-element-id="72"]').should('be.visible');
    cy.get('[data-element-id="72"]').contains('tr', 'Test Project')
      .find('[data-action="delete"]').click();
    cy.contains(/alumnos|asignados/i).should('be.visible');
  });

  // ── Flujo A4: filtros reactivos ──────────────────────────────────────────────

  it('filters the projects table in real time by name (#67)', () => {
    cy.get('[data-element-id="67"]').type('Test');
    cy.wait(400);
    cy.get('[data-element-id="72"]').find('tbody tr').each(($row) => {
      cy.wrap($row).invoke('text').then((text) => {
        expect(text.toLowerCase()).to.include('test');
      });
    });
  });

  // ── Nombre vacío ─────────────────────────────────────────────────────────────

  it('shows error when project name is empty on submit', () => {
    cy.get('[data-element-id="66"]').click();
    // Validation errors only mark aria-invalid, no visible toast text (same
    // pattern as the rest of the project's forms).
    cy.get('[data-element-id="61"]').should('have.attr', 'aria-invalid', 'true');
  });

  // ── Tabla vacía ──────────────────────────────────────────────────────────────

  it('shows empty state when no projects match the filter', () => {
    cy.get('[data-element-id="67"]').type('xxxxxnonexistent');
    cy.wait(400);
    // The empty-state message renders as a sibling <p> after the table, not
    // inside it (see corrector-projects-form.ts's template).
    cy.contains(/no hay proyectos/i).should('be.visible');
  });
});
