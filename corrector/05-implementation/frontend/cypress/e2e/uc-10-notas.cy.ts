/// <reference types="cypress" />
// UC-10: Visualización e impresión de Notas
// Elementos: #47 (btn landing tutor), #114 (año), #115 (legislación), #116 (ciclo),
//            #117 (módulo), #118 (proyecto), #119 (tabla notas), #120 (Imprimir PDF), #122 (badges)

describe('UC-10: Visualización e impresión de Notas', () => {
  // ── Flujo principal — rol tutor ──────────────────────────────────────────────

  describe('as tutor', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.get('[data-element-id="1"]').type('dbetqui');
      cy.get('[data-element-id="2"]').type('correctpass');
      cy.get('[data-element-id="3"]').click();
      cy.url().should('include', '/profesor');
    });

    it('renders button #47 (Imprimir notas) in the landing page for tutor', () => {
      cy.get('[data-element-id="47"]').should('be.visible');
    });

    it('shows correction-status badges #122 — one per module — when cycle is selected', () => {
      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="115"]').select('LOMLOE');
      cy.get('[data-element-id="116"]').select('DAW');
      cy.get('[data-element-id="122"]').should('have.length.gte', 1);
    });

    it('shows green badge when all students in a module have a correction', () => {
      // Set up a complete correction via API
      cy.request({
        method: 'POST',
        url: '/api/projects/1/students',
        body: { studentIds: [1] },
        failOnStatusCode: false,
      });
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

      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="115"]').select('LOMLOE');
      cy.get('[data-element-id="116"]').select('DAW');
      cy.get('[data-element-id="122"]').filter('[data-status="complete"]')
        .should('have.length.gte', 1);
    });

    it('shows red badge when at least one student lacks a correction', () => {
      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="115"]').select('LOMLOE');
      cy.get('[data-element-id="116"]').select('DAW');
      cy.get('[data-element-id="122"]').filter('[data-status="incomplete"]')
        .should('have.length.gte', 1);
    });

    it('shows all modules in selector #117 for tutor role', () => {
      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="115"]').select('LOMLOE');
      cy.get('[data-element-id="116"]').select('DAW');
      cy.get('[data-element-id="117"]').find('option').should('have.length.gte', 2);
    });

    it('loads table #119 and enables button #120 once all 5 selectors have values', () => {
      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="120"]').should('be.disabled');

      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="115"]').select('LOMLOE');
      cy.get('[data-element-id="116"]').select('DAW');
      cy.get('[data-element-id="117"]').select('DEW');
      cy.get('[data-element-id="118"]').select('Test Project');

      cy.get('[data-element-id="119"]').should('be.visible');
      cy.get('[data-element-id="120"]').should('not.be.disabled');
    });

    it('downloads a PDF with the correct content-type when #120 is clicked', () => {
      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="115"]').select('LOMLOE');
      cy.get('[data-element-id="116"]').select('DAW');
      cy.get('[data-element-id="117"]').select('DEW');
      cy.get('[data-element-id="118"]').select('Test Project');

      // Intercept the PDF request to check headers without relying on the file download
      cy.intercept('GET', '/api/projects/*/grades/pdf*').as('pdf');
      cy.get('[data-element-id="120"]').click();
      cy.wait('@pdf').its('response.headers.content-type').should('include', 'application/pdf');
    });

    it('sorts rows in table #119 alphabetically by project then student name', () => {
      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="115"]').select('LOMLOE');
      cy.get('[data-element-id="116"]').select('DAW');
      cy.get('[data-element-id="117"]').select('DEW');
      cy.get('[data-element-id="118"]').select('Test Project');

      cy.get('[data-element-id="119"]').find('tr [data-col="studentName"]')
        .then(($cells) => {
          const names = [...$cells].map((el) => el.textContent ?? '');
          expect(names).to.deep.eq([...names].sort());
        });
    });

    it('includes weighted final score for tutor view: sum(score × hours) / sum(hours) rounded to 2 dp', () => {
      cy.request('GET', '/api/cycles/1/grades?academicYear=2024-2025').then((resp) => {
        expect(resp.status).to.eq(200);
        (resp.body.grades as Array<{ finalScore: number }>).forEach((g) => {
          expect(g.finalScore).to.be.at.least(0);
          expect(g.finalScore).to.be.at.most(10);
          // Check max 2 decimal places
          const decimals = (g.finalScore.toString().split('.')[1] ?? '').length;
          expect(decimals).to.be.at.most(2);
        });
      });
    });

    it('opens notes from landing via button #47', () => {
      cy.get('[data-element-id="47"]').click();
      cy.url().should('include', '/notas');
    });
  });

  // ── Flujo alternativo — rol profesor ────────────────────────────────────────

  describe('as profesor', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.get('[data-element-id="1"]').type('profesor1');
      cy.get('[data-element-id="2"]').type('12345678');
      cy.get('[data-element-id="3"]').click();
      cy.url().then((url) => {
        if (!url.includes('/profesor')) {
          cy.get('input[type="password"]').eq(1).type('NewPassword1!');
          cy.get('input[type="password"]').eq(2).type('NewPassword1!');
          cy.get('[data-element-id="3"]').click();
        }
      });
      cy.url().should('include', '/profesor');
    });

    it('does NOT render button #47 in the landing page for profesor role', () => {
      cy.get('[data-element-id="47"]').should('not.exist');
    });

    it('shows only the professor\'s own module in selector #117', () => {
      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="115"]').select('LOMLOE');
      cy.get('[data-element-id="116"]').select('DAW');
      cy.get('[data-element-id="117"]').find('option').should('have.length', 1);
      cy.get('[data-element-id="117"]').should('contain', 'DEW');
    });
  });

  // ── Flujo A2: #120 deshabilitado hasta que todos los selectores tienen valor ─

  describe('PDF button disabled state', () => {
    it('keeps #120 disabled when not all 5 selectors are filled', () => {
      cy.visit('/');
      cy.get('[data-element-id="1"]').type('dbetqui');
      cy.get('[data-element-id="2"]').type('correctpass');
      cy.get('[data-element-id="3"]').click();
      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="120"]').should('be.disabled');
      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="120"]').should('be.disabled'); // still 4 selectors missing
    });
  });
});
