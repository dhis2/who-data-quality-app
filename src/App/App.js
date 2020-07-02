import React from 'react'
import { HashRouter as Router, Route, Switch, Redirect } from 'react-router-dom'
import { CssVariables } from '@dhis2/ui'

import { DataStoreProvider } from '@dhis2/app-service-datastore'

import { AppContextProvider } from './AppContext'

import {
    Dashboard,
    DataExportForExcel,
    OutliersAndMissingDataAnalysis,
    ConsistencyAnalysis,
    AnnualReport,
    Administration,
} from '../sections'

import { PATHS, ADMIN_AUTHORITIES } from '../config'
import SideNav from '../components/SideNav.js'
import NoMatch from '../components/NoMatch.js'
import classes from './App.module.css'
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
                <Router>
                    <CssVariables spacers colors />
                    <div className={classes.container}>
                        <aside className={classes.sidebar}>
                            <SideNav />
                        </aside>
                        <main className={classes.content}>
                            <Switch>
                                <Route
                                    path={PATHS.DASHBOARD}
                                    component={Dashboard}
                                />
                                <Route
                                    exact
                                    path={
                                        PATHS.OUTLIERS_AND_MISSING_DATA_ANALYSIS
                                    }
                                    component={OutliersAndMissingDataAnalysis}
                                />
                                <Route
                                    exact
                                    path={PATHS.CONSISTENCY_ANALYSIS}
                                    component={ConsistencyAnalysis}
                                />
                                <Route
                                    exact
                                    path={PATHS.ANNUAL_REPORT}
                                    component={AnnualReport}
                                />
                                <Route
                                    exact
                                    path={PATHS.ADMINISTRATION}
                                    component={Administration}
                                />
                                <Route
                                    exact
                                    path={PATHS.DATA_EXPORT_FOR_EXCEL}
                                    component={DataExportForExcel}
                                />
                                <Redirect exact from="/" to={PATHS.DASHBOARD} />
                                <Route component={NoMatch} />
                            </Switch>
                        </main>
                    </div>
                </Router>
            </DataStoreProvider>
        </AppContextProvider>
    )
}

export default App
