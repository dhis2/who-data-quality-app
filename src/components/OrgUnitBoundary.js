import React from 'react'
import { OrganisationUnitTree } from '@dhis2/ui'
import useDataCaptureAndAnalyticsOrgUnits from '../hooks/useDataCaptureAndAnalyticsOrgUnits.js'

const OrgUnitBoudary = () => {
    const { loading, error, data } = useDataCaptureAndAnalyticsOrgUnits()

    // TODO: improve error and loading UI
    if (loading) {
        return <span>loading....</span>
    }

    if (error && !loading) {
        return <span>{error.message}</span>
    }

    return <OrganisationUnitTree data={data} />
}

export default OrgUnitBoudary
