import useAppDataQuery from './useAppDataQuery'

import { useAppContext } from '../App/AppContext.js'
import { useDataQuery } from '@dhis2/app-runtime'

export default function() {
    const {
        userOrganisationUnits,
        userDataViewOrganisationUnits,
    } = useAppContext()

    console.log(userOrganisationUnits, userDataViewOrganisationUnits)
    return {
        loading: true,
        error: false,
        data: null,
    }
}
