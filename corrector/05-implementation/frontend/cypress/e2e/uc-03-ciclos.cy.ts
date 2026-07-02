/// <reference types="cypress" />
// UC-03: Gestión de Ciclos
// Elementos: #12 (tab), #13 (nombre), #14 (año), #15 (legislación), #16 (Guardar),
//            #17 (filtro año), #18 (filtro legislación), #19 (filtro nombre), #20 (tabla), #21 (col año fin)

describe('UC-03: Gestión de Ciclos', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-element-id="1"]').type('admin');
    cy.get('[data-element-id="2"]').type('Admin1234!');
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/admin');
    cy.get('[data-element-id="12"]').click();
    cy.url().should('include', '/admin/ciclos');
  });

  // ── Flujo principal ──────────────────────────────────────────────────────────

  it('navigates to /admin/ciclos on tab click and shows the cycles table', () => {
    cy.get('[data-element-id="12"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-element-id="20"]').should('be.visible');
  });

  it('creates a cycle with only its name (no legislation_id persisted)', () => {
    cy.get('[data-element-id="13"]').type('CFGS Robótica');
    cy.get('[data-element-id="16"]').click();
    cy.get('[data-element-id="20"]').contains('CFGS Robótica').should('be.visible');
    // Verify the new row does NOT display a legislation column value
    cy.get('[data-element-id="20"]').contains('tr', 'CFGS Robótica')
      .find('[data-col="legislationId"]').should('be.empty');
  });

  it('shows año finalización as start_year + 1 in column #21', () => {
    // Select a year via navigation selector #14
    cy.get('[data-element-id="14"]').select('2020');
    cy.get('[data-element-id="20"]').find('[data-element-id="21"]').first()
      .invoke('text').then((text) => {
        expect(Number(text)).to.equal(2021);
      });
  });

  it('the navigation selectors #14 and #15 are not persisted in the cycle record', () => {
    cy.get('[data-element-id="13"]').type('Ciclo Sin Leg');
    cy.get('[data-element-id="14"]').select('2020');
    cy.get('[data-element-id="15"]').select('LOMLOE');
    cy.get('[data-element-id="16"]').click();
    // Call API to verify legislation_id is null/absent on the new cycle
    cy.request('GET', '/api/cycles').then((resp) => {
      const created = (resp.body as Array<{ name: string; legislationId?: unknown }>)
        .find((c) => c.name === 'Ciclo Sin Leg');
      expect(created).to.exist;
      expect(created!.legislationId).to.be.oneOf([null, undefined]);
    });
  });

  // ── Flujo A1: nombre duplicado ───────────────────────────────────────────────

  it('rejects a duplicate cycle name with an error', () => {
    cy.get('[data-element-id="13"]').type('DAW');
    cy.get('[data-element-id="16"]').click();
    cy.contains(/ya existe|already exists/i).should('be.visible');
  });

  // ── Flujo A3: filtrado reactivo ──────────────────────────────────────────────

  it('filters the cycles table in real time via the name filter (#19)', () => {
    cy.get('[data-element-id="19"]').type('DAW');
    cy.get('[data-element-id="20"]').find('tr').each(($row) => {
      cy.wrap($row).invoke('text').then((text) => {
        expect(text.toLowerCase()).to.include('daw');
      });
    });
  });

  // ── Flujo A4: borrado con módulos ────────────────────────────────────────────

  it('blocks deletion of a cycle that has associated modules', () => {
    // DAW cycle has modules in the seed
    cy.get('[data-element-id="20"]').contains('DAW')
      .parents('tr').find('[data-action="delete"]').click();
    cy.contains(/módulos|dependientes|eliminar primero/i).should('be.visible');
  });
});
