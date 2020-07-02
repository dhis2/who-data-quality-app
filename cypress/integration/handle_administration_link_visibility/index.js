import { Before, Given, When, Then } from 'cypress-cucumber-preprocessor/steps'

Before(() => {
    cy.server()
})

Given('the user has authority ALL or F_INDICATOR_PUBLIC_ADD', () => {
    cy.fixture('SideNav/me').then(fx => {
        cy.route({
            url: `${Cypress.env('dhis2_base_url')}/api/me`,
            response: {
                ...fx,
                authorities: ['ALL', 'F_INDICATOR_PUBLIC_ADD'],
            },
        })
    })
})

Given('the user has authority F_INDICATOR_PUBLIC_ADD', () => {
    cy.fixture('SideNav/me').then(fx => {
        cy.route({
            url: `${Cypress.env('dhis2_base_url')}/api/me`,
            response: {
                ...fx,
                authorities: ['F_INDICATOR_PUBLIC_ADD'],
            },
        })
    })
})

Given('the user has authority ALL', () => {
    cy.fixture('SideNav/me').then(fx => {
        cy.route({
            url: `${Cypress.env('dhis2_base_url')}/api/me`,
            response: {
                ...fx,
                authorities: ['ALL'],
            },
        })
    })
})

Given('the user does not have authority to administer the app', () => {
    cy.fixture('SideNav/me').then(fx => {
        cy.route({
            url: `${Cypress.env('dhis2_base_url')}/api/32/me`,
            method: 'GET',
            response: {
                ...fx,
                authorities: [],
            },
        })
    })
})

When('the user accesses any page', () => {
    cy.visit('/#')
})

Then('the administration link in the menu is visible', () => {
    cy.get('[data-test="who-sidenav"] span.label')
        .contains('Administration')
        .should('exist')
})

Then('the administration link in the menu is hidden', () => {
    cy.get('[data-test="who-sidenav"] span.label')
        .contains('Administration')
        .should('not.exist')
})
