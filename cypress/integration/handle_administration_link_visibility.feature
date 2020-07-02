Feature: Handle administration link visibility
    
    Scenario: A user with ALL and F_INDICATOR_PUBLIC_ADD visits the page
        Given the user has authority ALL and F_INDICATOR_PUBLIC_ADD
        When the user accesses any page
        Then the administration link in the menu is visible

    Scenario: A user with ALL authority visits the page
        Given the user has authority ALL
        When the user accesses any page
        Then the administration link in the menu is visible

    Scenario: A user with F_INDICATOR_PUBLIC_ADD authority visits the page
        Given the user has authority F_INDICATOR_PUBLIC_ADD
        When the user accesses any page
        Then the administration link in the menu is visible

    Scenario: A non-admin user visits the page
        Given the user does not have authority to administer the app
        When the user accesses any page
        Then the administration link in the menu is hidden
