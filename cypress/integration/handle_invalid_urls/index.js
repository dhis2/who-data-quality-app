import { Given, Then } from 'cypress-cucumber-preprocessor/steps'

Given('the user accesses the app at the root URL', () => {
    cy.visit('/#')
})

Then('the user is redirected to the first tab of the dashboard section', () => {
    cy.url().should(url => {
        const baseUrl = Cypress.config('baseUrl')
        const expectedUrl = `${baseUrl}/#/dashboard/completeness`

        expect(url).to.equal(expectedUrl)
    })
})

Given('the user accesses the app at an invalid URL', () => {
    cy.visit('/#/i-am-an-invalid-url')
})
Then('the NoMatch component is rendered', () => {
    cy.contains('Page not found').should('be.visible')
})
