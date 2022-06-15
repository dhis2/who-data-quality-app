import i18n from '@dhis2/d2-i18n'
import { Button, Card, TabBar } from '@dhis2/ui'
import cx from 'classnames'
import React from 'react'
import { Route, Switch, Redirect } from 'react-router-dom'
import sectionClasses from '../../components/Section.module.css'
import TabLink from '../../components/TabLink.js'
import { DASHBOARD } from '../../config'
import Completeness from './Completeness.js'
import ConsistencyData from './ConsistencyData.js'
import ConsistencyTime from './ConsistencyTime.js'
import classes from './Dashboard.module.css'
import Outliers from './Outliers.js'

const PATHS = {
    COMPLETENESS: `${DASHBOARD}/completeness`,
    CONSISTENCY_TIME: `${DASHBOARD}/consistency-time`,
    CONSISTENCY_DATA: `${DASHBOARD}/consistency-data`,
    OUTLIERS: `${DASHBOARD}/outliers`,
}

const Dashboard = () => (
    <>
        <h1 className={cx([sectionClasses.header], [classes.header])}>
            <span className={classes.headerText}>{i18n.t('Dashboard')}</span>
            <Button className={classes.filterButton} primary>
                Filter
            </Button>
        </h1>
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
                    <Route exact path={PATHS.OUTLIERS} component={Outliers} />
                    <Redirect from={DASHBOARD} to={PATHS.COMPLETENESS} />
                </Switch>
            </div>
        </Card>
    </>
)

export default Dashboard
