import '@dhis2/cli-utils-cypress/support'
import { loginAndPersistSession, enableNetworkShim } from './server'

enableNetworkShim()
loginAndPersistSession()
