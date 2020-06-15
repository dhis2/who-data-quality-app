import React from 'react'
import i18n from '@dhis2/d2-i18n'
import { Menu, MenuItem, MenuSectionHeader, MenuDivider } from '@dhis2/ui'

import MenuItemLink from './MenuItemLink.js'
import PATHS from '../config/paths.js'

const SideNav = () => (
    <nav>
        <Menu>
            <MenuItemLink to={PATHS.DASHBOARD} label={i18n.t('Dashboard')} />
            <MenuSectionHeader label={i18n.t('Analysis')} />
            <MenuItemLink
                to={PATHS.OUTLIERS_AND_MISSING_DATA_ANALYSIS}
                label={i18n.t('Outliers and missing data')}
            />
            <MenuItemLink
                to={PATHS.CONSISTENCY_ANALYSIS}
                label={i18n.t('Consistency')}
            />
            <MenuDivider />
            <MenuItemLink
                to={PATHS.ANNUAL_REPORT}
                label={i18n.t('Annual report')}
            />
            <MenuSectionHeader label={i18n.t('More')} />
            <MenuItemLink
                to={PATHS.ADMINISTRATION}
                label={i18n.t('Administration')}
            />
            <MenuItemLink
                to={PATHS.DATA_EXPORT_FOR_EXCEL}
                label={i18n.t('Data export for Excel tool')}
            />
            <MenuItem
                href="https://www.ssb.no/en/helse/artikler-og-publikasjoner/manual-for-the-dhis2-quality-tool"
                target="_blank"
                label={i18n.t('User manual')}
            />
            <MenuDivider />
        </Menu>
    </nav>
)

export default SideNav
