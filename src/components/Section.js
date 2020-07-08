import React from 'react'
import cx from 'classnames'

import propTypes from '@dhis2/prop-types'
import { Card } from '@dhis2/ui'

import classes from './Section.module.css'

const Section = ({ headerText, children, padding = true }) => (
    <div className={classes.container}>
        <h1 className={classes.header}>{headerText}</h1>
        <Card
            className={cx({
                [classes.padding]: padding,
            })}
        >
            {children}
        </Card>
    </div>
)

Section.propTypes = {
    children: propTypes.node,
    headerText: propTypes.string,
    padding: propTypes.bool,
}

export default Section
