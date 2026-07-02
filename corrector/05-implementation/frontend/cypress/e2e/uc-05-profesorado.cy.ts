/// <reference types="cypress" />
// UC-05: Gestión de Profesorado
// Elementos: #34 (tab), #35 (usuario), #36 (contraseña), #37 (año), #38 (legislación),
//            #39 (ciclo), #40 (módulo), #41 (Guardar), #42–#45 (filtros), #46 (tabla)

describe('UC-05: Gestión de Profesorado', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.get('[data-element-id="1"]').type('admin');
    cy.get('[data-element-id="2"]').type('Admin1234!');
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/admin');
    cy.get('[data-element-id="34"]').click();
    cy.url().should('include', '/admin/profesorado');
  });

  // ── Flujo principal ──────────────────────────────────────────────────────────

  it('navigates to /admin/profesorado on tab click and shows the teachers table', () => {
    cy.get('[data-element-id="34"]').should('have.attr', 'aria-selected', 'true');
    cy.get('[data-element-id="46"]').should('be.visible');
  });

  it('creates a profesor and shows them in table #46 with must_change_password = true', () => {
    cy.get('[data-element-id="35"]').type('nuevoprofe');
    cy.get('[data-element-id="36"]').type('Password1!');
    cy.get('[data-element-id="37"]').select('2020');
    cy.get('[data-element-id="38"]').select('LOMLOE');
    cy.get('[data-element-id="39"]').select('DAW');
    cy.get('[data-element-id="40"]').select('DEW');
    cy.get('[data-element-id="41"]').click();
    // Row appears without page reload
    cy.get('[data-element-id="46"]').contains('nuevoprofe').should('be.visible');
    // Password column shows '12345678' when must_change_password = true
    cy.get('[data-element-id="46"]').contains('tr', 'nuevoprofe')
      .should('contain', '12345678');
  });

  it('shows ******** in password column when must_change_password = false', () => {
    // admin teacher has must_change_password = false in the seed
    cy.get('[data-element-id="46"]').contains('tr', 'admin')
      .should('contain', '********');
  });

  // ── Flujo A1: username duplicado ────────────────────────────────────────────

  it('rejects a duplicate username with an error', () => {
    cy.get('[data-element-id="35"]').type('admin');
    cy.get('[data-element-id="36"]').type('Password1!');
    cy.get('[data-element-id="40"]').select('DEW');
    cy.get('[data-element-id="41"]').click();
    cy.contains(/ya existe|already exists|duplicado/i).should('be.visible');
  });

  // ── Flujo A2: desbloqueo de cuenta ──────────────────────────────────────────

  it('unlocks a blocked teacher account and resets failed_login_attempts to 0', () => {
    // First lock the teacher by forcing 3 bad logins via API
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'lockedteacher', password: 'bad' },
      failOnStatusCode: false,
    });
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'lockedteacher', password: 'bad' },
      failOnStatusCode: false,
    });
    cy.request({
      method: 'POST',
      url: '/api/auth/login',
      body: { username: 'lockedteacher', password: 'bad' },
      failOnStatusCode: false,
    });
    cy.reload();
    cy.get('[data-element-id="46"]').contains('tr', 'lockedteacher')
      .find('[data-action="unlock"]').click();
    cy.get('[data-element-id="46"]').contains('tr', 'lockedteacher')
      .should('contain', '0'); // failedLoginAttempts = 0
  });

  // ── Flujo A5: cascada de asignación ─────────────────────────────────────────

  it('cascades selectors from year (#37) to module (#40)', () => {
    cy.get('[data-element-id="40"]').should('be.disabled');
    cy.get('[data-element-id="37"]').select('2020');
    cy.get('[data-element-id="38"]').select('LOMLOE');
    cy.get('[data-element-id="39"]').select('DAW');
    cy.get('[data-element-id="40"]').should('not.be.disabled');
  });

  // ── Filtros reactivos ─────────────────────────────────────────────────────────

  it('filters the teachers table in real time by module (#45)', () => {
    cy.get('[data-element-id="45"]').select('DEW');
    cy.get('[data-element-id="46"]').find('tr').each(($row) => {
      cy.wrap($row).invoke('text').then((text) => {
        expect(text.toLowerCase()).to.include('dew');
      });
    });
  });

  // ── Validación contraseña < 8 caracteres ────────────────────────────────────

  it('shows error when password is shorter than 8 characters', () => {
    cy.get('[data-element-id="35"]').type('testuser');
    cy.get('[data-element-id="36"]').type('short');
    cy.get('[data-element-id="41"]').click();
    cy.contains(/8 caracteres|mínimo/i).should('be.visible');
  });
});
