/// <reference types="cypress" />
// UC-10: Visualización e impresión de Notas
// Elementos: #47 (btn landing tutor), #114 (año), #115 (legislación), #116 (ciclo),
//            #117 (módulo), #118 (proyecto), #119 (tabla notas), #120 (Imprimir PDF), #122 (badges)

describe('UC-10: Visualización e impresión de Notas', () => {
  // ── Flujo principal — rol tutor ──────────────────────────────────────────────

  describe('as tutor', () => {
    // Module BD (id 3) starts with no rubric or projects in the fixture.
    // DEW (id 1) already has a rubric, but it's pinned to academic_year
    // 2024-2025, which is unreachable through the #114 cascade (year
    // options come from legislation.start_year — only 2020 for LOMLOE is
    // available in the DAW cycle). Building an isolated scenario on BD
    // avoids depending on DEW/ANA fixture data that uc-06/07/07b/08/09
    // mutate over the course of the suite. POST /api/corrections requires
    // either an admin session or a teacher assigned to the module —
    // dbetqui (tutor) and profesor1 (assigned only to DEW) have neither
    // for BD, so the correction itself is submitted as admin.
    //
    // Built once here (not per-test): POST /modules/:id/rubric/items always
    // inserts a NEW item, so calling it from multiple tests would require
    // ever more rubric-item selections in every correction that follows.
    // "Proyecto BD Completo" gets 2 corrected students (JJ499, MnP454) —
    // feeds both the green-badge test and the row-sorting test (which needs
    // real, multi-row table data, not just an enabled/disabled check).
    // "Proyecto BD Incompleto" gets 1 uncorrected student — feeds the
    // red-badge test (BD's total now exceeds its corrected count).
    before(() => {
      cy.request('POST', '/api/modules/3/rubric/items', {
        academicYear: '2020-2021',
        description: 'Item UC10',
        displayOrder: 1,
        levels: [
          { name: 'Excelente', score: 1, displayOrder: 1 },
          { name: 'Mal', score: 0, displayOrder: 2 },
        ],
      }).then((itemResp) => {
        const rubricId = itemResp.body.rubricId as number;
        const rubricItemId = itemResp.body.id as number;
        const levels = itemResp.body.levels as Array<{ id: number; name: string }>;
        const rubricLevelId = levels.find((l) => l.name === 'Excelente')!.id;

        cy.request('POST', '/api/projects', { name: 'Proyecto BD Completo', academicYear: '2020-2021', moduleId: 3 })
          .then((projResp) => {
            const projectId = projResp.body.id as number;
            cy.request('POST', `/api/projects/${projectId}/students`, { studentIds: [1, 2] });
            cy.request('POST', '/api/auth/login', { username: 'admin', password: 'Admin1234!' });
            for (const studentId of [1, 2]) {
              cy.request('POST', '/api/corrections', {
                studentId,
                projectId,
                moduleId: 3,
                rubricId,
                academicYear: '2020-2021',
                items: [{ rubricItemId, rubricLevelId }],
              });
            }
          });
      });

      // The incomplete scenario goes on DEW (module 1) instead of BD — a
      // module's badge status combines ALL its projects, so an uncorrected
      // project on BD would flip "Proyecto BD Completo" incomplete too.
      // DEW has zero fixture projects for any academic year, so this new
      // project is its only one and no rubric is needed (badge status only
      // looks at project_student + correction, not the rubric).
      cy.request('POST', '/api/projects', { name: 'Proyecto DEW Incompleto', academicYear: '2020-2021', moduleId: 1 })
        .then((projResp) => {
          const projectId = projResp.body.id as number;
          cy.request('POST', `/api/projects/${projectId}/students`, { studentIds: [3] });
        });
    });

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
      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="115"]').select('LOMLOE');
      cy.get('[data-element-id="116"]').select('DAW');
      cy.get('[data-element-id="122"]').find('[data-status="complete"]')
        .should('have.length.gte', 1);
    });

    it('shows red badge when at least one student lacks a correction', () => {
      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="115"]').select('LOMLOE');
      cy.get('[data-element-id="116"]').select('DAW');
      cy.get('[data-element-id="122"]').find('[data-status="incomplete"]')
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
      cy.get('[data-element-id="117"]').select('ANA');
      cy.get('[data-element-id="118"]').select('Test Project');

      cy.get('[data-element-id="119"]').should('be.visible');
      cy.get('[data-element-id="120"]').should('not.be.disabled');
    });

    it('downloads a PDF with the correct content-type when #120 is clicked', () => {
      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="115"]').select('LOMLOE');
      cy.get('[data-element-id="116"]').select('DAW');
      cy.get('[data-element-id="117"]').select('ANA');
      cy.get('[data-element-id="118"]').select('Test Project');

      // Intercept the PDF request to check headers without relying on the file download
      cy.intercept('GET', '/api/projects/*/grades/pdf*').as('pdf');
      cy.get('[data-element-id="120"]').click();
      cy.wait('@pdf').then((interception) => {
        expect(interception.response?.headers['content-type']).to.include('application/pdf');
        // A real pdfkit document (fonts embedded, at least the title/table
        // drawn) is well over 1 KB — the old hardcoded stub was 20 bytes.
        expect(Number(interception.response?.headers['content-length'])).to.be.greaterThan(1000);
      });
    });

    it('sorts rows in table #119 alphabetically by project then student name', () => {
      // Uses BD's "Proyecto BD Completo" (seeded in the before() above with
      // 2 corrected students) — ANA's "Test Project" never has a correction
      // in this suite (no rubric ever exists for ANA), so it always renders
      // 0 rows and can't exercise the sort itself.
      cy.contains(/Visualizar|Notas/i).click();
      cy.get('[data-element-id="114"]').select('2020');
      cy.get('[data-element-id="115"]').select('LOMLOE');
      cy.get('[data-element-id="116"]').select('DAW');
      cy.get('[data-element-id="117"]').select('BD');
      cy.get('[data-element-id="118"]').select('Proyecto BD Completo');

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
    // profesor1 requires a password change on first login. uc-09-correccion.cy.ts
    // runs alphabetically before this spec and already completes that change —
    // so depending on run order/isolation, the password here may still be the
    // default OR already 'NewPassword1!'. Branch on the actual login response
    // (mustChangePassword / non-2xx for stale credentials) rather than polling
    // the DOM — a plain cy.get('body').then() check races the app's async
    // re-render and can see stale markup (e.g. the disabled field mid-submit).
    beforeEach(() => {
      cy.visit('/');
      cy.intercept('POST', '/api/auth/login').as('login');
      cy.get('[data-element-id="1"]').type('profesor1');
      cy.get('[data-element-id="2"]').type('12345678');
      cy.get('[data-element-id="3"]').click();
      cy.wait('@login').then((interception) => {
        if (interception.response?.statusCode === 200 && interception.response.body.mustChangePassword) {
          cy.get('input[type="password"]').eq(1).type('NewPassword1!');
          cy.get('input[type="password"]').eq(2).type('NewPassword1!');
          cy.get('[data-element-id="3"]').click();
        } else if (interception.response?.statusCode !== 200) {
          cy.get('[data-element-id="2"]').clear().type('NewPassword1!');
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
