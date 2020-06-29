import React, { useState } from 'react'
import i18n from '@dhis2/d2-i18n'
import cx from 'classnames'
import { Route, Switch, Redirect } from 'react-router-dom'
import { Button, Card, TabBar } from '@dhis2/ui'

import Completeness from './Completeness.js'
import ConsistencyTime from './ConsistencyTime.js'
import ConsistencyData from './ConsistencyData.js'
import Outliers from './Outliers.js'

import TabLink from '../../components/TabLink.js'
import sectionClasses from '../../components/Section.module.css'
import { DASHBOARD } from '../../config'
import Filter from './Filter/Filter.js'
import classes from './Dashboard.module.css'

const PATHS = {
    COMPLETENESS: `${DASHBOARD}/completeness`,
    CONSISTENCY_TIME: `${DASHBOARD}/consistency-time`,
    CONSISTENCY_DATA: `${DASHBOARD}/consistency-data`,
    OUTLIERS: `${DASHBOARD}/outliers`,
}

const Dashboard = () => {
    const [showFilter, setShowFilter] = useState(false)

    return (
        <>
            <h1 className={cx([sectionClasses.header], [classes.header])}>
                <span className={classes.headerText}>
                    {i18n.t('Dashboard')}
                </span>
                <Button
                    className={classes.filterButton}
                    onClick={() => setShowFilter(!showFilter)}
                    primary
                >
                    {i18n.t('Filter')}
                </Button>
            </h1>
            {showFilter && <Filter />}
            <Card>
                <TabBar fixed>
                    <TabLink to={PATHS.COMPLETENESS}>
                        {i18n.t('Completeness')}
                    </TabLink>
                    <TabLink to={PATHS.CONSISTENCY_TIME}>
                        {i18n.t('Consistency - time')}
                    </TabLink>
                    <TabLink to={PATHS.CONSISTENCY_DATA}>
                        {i18n.t('Consistency - data')}
                    </TabLink>
                    <TabLink to={PATHS.OUTLIERS}>{i18n.t('Outliers')}</TabLink>
                </TabBar>
                <div className={sectionClasses.content}>
                    <Switch>
                        <Route
                            exact
                            path={PATHS.COMPLETENESS}
                            component={Completeness}
                        />
                        <Route
                            exact
                            path={PATHS.CONSISTENCY_TIME}
                            component={ConsistencyTime}
                        />
                        <Route
                            exact
                            path={PATHS.CONSISTENCY_DATA}
                            component={ConsistencyData}
                        />
                        <Route
                            exact
                            path={PATHS.OUTLIERS}
                            component={Outliers}
                        />
                        <Redirect from={DASHBOARD} to={PATHS.COMPLETENESS} />
                    </Switch>
                </div>
            </Card>
        </>
    )
}

export default Dashboard
