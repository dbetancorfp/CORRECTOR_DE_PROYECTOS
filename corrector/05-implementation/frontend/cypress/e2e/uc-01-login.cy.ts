/// <reference types="cypress" />
// UC-01: Login, logout y gestión de sesión
// Elementos: #1 (campo usuario), #2 (campo contraseña), #3 (botón Acceder), #11 (botón Salir)

describe('UC-01: Login, logout y gestión de sesión', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  // ── Flujo principal ──────────────────────────────────────────────────────────

  it('allows admin to log in and reach the admin panel', () => {
    cy.get('[data-element-id="1"]').type('admin');
    cy.get('[data-element-id="2"]').type('Admin1234!');
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/admin');
  });

  it('allows profesor to log in and reach the profesor panel', () => {
    cy.get('[data-element-id="1"]').type('profesor1');
    cy.get('[data-element-id="2"]').type('12345678');
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/profesor');
  });

  it('allows login via Enter key without clicking the button', () => {
    cy.get('[data-element-id="1"]').type('admin');
    cy.get('[data-element-id="2"]').type('Admin1234!{enter}');
    cy.url().should('include', '/admin');
  });

  it('logs out and redirects to / without a confirmation dialog', () => {
    cy.get('[data-element-id="1"]').type('admin');
    cy.get('[data-element-id="2"]').type('Admin1234!');
    cy.get('[data-element-id="3"]').click();
    cy.url().should('include', '/admin');
    cy.get('[data-element-id="11"]').click();
    cy.url().should('eq', Cypress.config('baseUrl') + '/');
  });

  // ── Flujo A1: credenciales inválidas ────────────────────────────────────────

  it('shows error message after invalid credentials', () => {
    cy.get('[data-element-id="1"]').type('nadie');
    cy.get('[data-element-id="2"]').type('wrongpass');
    cy.get('[data-element-id="3"]').click();
    cy.contains('Credenciales incorrectas').should('be.visible');
    cy.url().should('eq', Cypress.config('baseUrl') + '/');
  });

  // ── Flujo A2: cuenta bloqueada (profesor/tutor) ──────────────────────────────

  it('shows admin-contact message after 3rd failed login for profesor', () => {
    const tryLogin = () => {
      cy.get('[data-element-id="1"]').clear().type('lockedcandidate');
      cy.get('[data-element-id="2"]').clear().type('wrongpassword');
      cy.get('[data-element-id="3"]').click();
    };
    // Three consecutive failures lock the account
    tryLogin();
    tryLogin();
    tryLogin();
    cy.contains('Administrador').should('be.visible');
  });

  // ── Flujo A4: primer acceso — must_change_password = true ───────────────────

  it('shows inline password-change fields when must_change_password is true', () => {
    cy.get('[data-element-id="1"]').type('profesor1');
    cy.get('[data-element-id="2"]').type('12345678');
    cy.get('[data-element-id="3"]').click();
    // Inline password-change form should appear before redirect
    cy.get('[data-element-id="3"]').should('exist');
    cy.get('input[type="password"]').should('have.length.gte', 2);
  });

  it('keeps user on login screen when change-password fields do not match', () => {
    cy.get('[data-element-id="1"]').type('profesor1');
    cy.get('[data-element-id="2"]').type('12345678');
    cy.get('[data-element-id="3"]').click();
    // Fill in mismatching new passwords
    cy.get('input[type="password"]').eq(1).type('NewPass1!');
    cy.get('input[type="password"]').eq(2).type('DifferentPass!');
    cy.get('[data-element-id="3"]').click();
    cy.contains(/no coinciden/i).should('be.visible');
    cy.url().should('eq', Cypress.config('baseUrl') + '/');
  });

  // ── Campo de contraseña siempre enmascarado ──────────────────────────────────

  it('always masks the password field characters', () => {
    cy.get('[data-element-id="2"]').should('have.attr', 'type', 'password');
  });
});
