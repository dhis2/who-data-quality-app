import React from 'react'
import { HashRouter as Router, Route, Switch, Redirect } from 'react-router-dom'
import { CssVariables } from '@dhis2/ui'

import SideNav from '../components/SideNav.js'
import NoMatch from '../components/NoMatch.js'
import Dashboard from '../Dashboard/Dashboard.js'
import OutliersAndMissingDataAnalysis from '../OutliersAndMissingDataAnalysis/OutliersAndMissingDataAnalysis.js'
import ConsistencyAnalysis from '../ConsistencyAnalysis/ConsistencyAnalysis.js'
import AnnualReport from '../AnnualReport/AnnualReport.js'
import Administration from '../Administration/Administration.js'
import DataExportForExcel from '../DataExportForExcel/DataExportForExcel.js'
import * as PATHS from '../config/paths.js'

import classes from './App.module.css'

const App = () => (
    <Router>
        <CssVariables spacers colors />
        <div className={classes.container}>
            <aside className={classes.sidebar}>
                <SideNav />
            </aside>
            <main className={classes.content}>
                <Switch>
                    <Route path={PATHS.DASHBOARD} component={Dashboard} />
                    <Route
                        exact
                        path={PATHS.OUTLIERS_AND_MISSING_DATA_ANALYSIS}
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
)

export default App
