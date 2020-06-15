Feature: Handle invalid URLs

    Scenario: The root URL is redirected to the first tab in the dashboard section
        Given the user accesses the app at the root URL
        Then the user is redirected to the first tab of the dashboard section

    Scenario: When the app is accessed at an invalid URL the NoMatch component is rendered
        Given the user accesses the app at an invalid URL
        Then the NoMatch component is rendered
