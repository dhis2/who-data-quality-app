import React from 'react'

import { DataStoreProvider } from '@dhis2/app-service-datastore'

import { AppContextProvider } from './AppContext'
import AppRouter from './AppRouter'
import { ADMIN_AUTHORITIES } from '../config'
import useAuthorites from '../hooks/useAuthorites'

const App = () => {
    //TODO: take care of error
    const { loading, hasAnyAuthority } = useAuthorites(ADMIN_AUTHORITIES)

    if (loading) {
        //TODO: add loading component
        return null
    }

    return (
        <AppContextProvider value={{ currentUserIsAdmin: hasAnyAuthority }}>
            <DataStoreProvider namespace="dataQualityTool">
                <AppRouter />
            </DataStoreProvider>
        </AppContextProvider>
    )
}

export default App
