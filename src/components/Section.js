import React from 'react'
import propTypes from '@dhis2/prop-types'
import { Card } from '@dhis2/ui'

import classes from './Section.module.css'

const Section = ({ headerText, children }) => (
    <div className={classes.container}>
        <h1 className={classes.header}>{headerText}</h1>
        <Card className={classes.content}>{children}</Card>
    </div>
)

Section.propTypes = {
    children: propTypes.node,
    headerText: propTypes.string,
}

export default Section
