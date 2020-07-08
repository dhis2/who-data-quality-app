import React from 'react'
import i18n from '@dhis2/d2-i18n'

import { Route, Switch, Redirect } from 'react-router-dom'
import { TabBar } from '@dhis2/ui'

import { useAppContext } from '../../App/AppContext.js'

import TabLink from '../../components/TabLink.js'

import Section from '../../components/Section.js'

import Numerators from './Numerators.js'
import NumeratorEdit from './NumeratorEdit.js'

import NumeratorGroups from './NumeratorGroups.js'
import NumeratorRelations from './NumeratorRelations.js'
import NumeratorQuality from './NumeratorQuality.js'
import Denominators from './Denominators.js'
import DenominatorRelations from './DenominatorRelations.js'
import ExternalDataComparison from './ExternalDataComparison.js'

import { PATHS as ROOT_PATHS } from '../../config'

export const PATHS = {
    NUMERATORS: `${ROOT_PATHS.ADMINISTRATION}/numerators`,
    NUMERATOR_EDIT: `${ROOT_PATHS.ADMINISTRATION}/numerators/:code/edit`,

    NUMERATOR_GROUPS: `${ROOT_PATHS.ADMINISTRATION}/numerator-groups`,
    NUMERATOR_RELATIONS: `${ROOT_PATHS.ADMINISTRATION}/numerator-relations`,
    NUMERATOR_QUALITY: `${ROOT_PATHS.ADMINISTRATION}/numerator-quality`,
    DENOMINATORS: `${ROOT_PATHS.ADMINISTRATION}/denominators`,
    DENOMINATOR_RELATIONS: `${ROOT_PATHS.ADMINISTRATION}/denominator-relations`,
    EXTERNAL_DATA_COMPARISON: `${ROOT_PATHS.ADMINISTRATION}/external-data-comparison`,
    PERMISSION_DENIED: `${ROOT_PATHS.ADMINISTRATION}/permission-denied`,
}

const Administration = () => {
    const { currentUserIsAdmin } = useAppContext()

    return !currentUserIsAdmin ? (
        <Redirect to="/" />
    ) : (
        <Section headerText={i18n.t('Administration')} padding={false}>
            <TabBar scrollable>
                <TabLink to={PATHS.NUMERATORS}>{i18n.t('Numerators')}</TabLink>
                <TabLink to={PATHS.NUMERATOR_GROUPS}>
                    {i18n.t('Numerator groups')}
                </TabLink>
                <TabLink to={PATHS.NUMERATOR_RELATIONS}>
                    {i18n.t('Numerator relations')}
                </TabLink>
                <TabLink to={PATHS.NUMERATOR_QUALITY}>
                    {i18n.t('Numerators quality parameters')}
                </TabLink>
                <TabLink to={PATHS.DENOMINATORS}>
                    {i18n.t('Denominators')}
                </TabLink>
                <TabLink to={PATHS.DENOMINATOR_RELATIONS}>
                    {i18n.t('Denominator relations')}
                </TabLink>
                <TabLink to={PATHS.EXTERNAL_DATA_COMPARISON}>
                    {i18n.t('External data comparison')}
                </TabLink>
            </TabBar>
            <Switch>
                <Route exact path={PATHS.NUMERATORS} component={Numerators} />
                <Route
                    exact
                    path={PATHS.NUMERATOR_EDIT}
                    component={NumeratorEdit}
                />
                <Route
                    exact
                    path={PATHS.NUMERATOR_GROUPS}
                    component={NumeratorGroups}
                />
                <Route
                    exact
                    path={PATHS.NUMERATOR_RELATIONS}
                    component={NumeratorRelations}
                />
                <Route
                    exact
                    path={PATHS.NUMERATOR_QUALITY}
                    component={NumeratorQuality}
                />
                <Route
                    exact
                    path={PATHS.DENOMINATORS}
                    component={Denominators}
                />
                <Route
                    exact
                    path={PATHS.DENOMINATOR_RELATIONS}
                    component={DenominatorRelations}
                />
                <Route
                    exact
                    path={PATHS.EXTERNAL_DATA_COMPARISON}
                    component={ExternalDataComparison}
                />
                <Redirect
                    from={ROOT_PATHS.ADMINISTRATION}
                    to={PATHS.NUMERATORS}
                />
            </Switch>
        </Section>
    )
}

export default Administration
