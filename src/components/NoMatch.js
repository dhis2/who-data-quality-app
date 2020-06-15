import React from 'react'
import i18n from '@dhis2/d2-i18n'

import classes from './NoMatch.module.css'

const NoMatch = () => (
    <div className={classes.container}>
        <h1 className={classes.content}>{i18n.t('Page not found')}</h1>
    </div>
)

export default NoMatch
