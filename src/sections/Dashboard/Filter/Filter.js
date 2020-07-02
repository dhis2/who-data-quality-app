import React from 'react'
import { Card } from '@dhis2/ui'
// import propTypes from '@dhis2/prop-types'

import classes from './Filter.module.css'

const Filter = () => {
    return (
        <div className={classes.container}>
            <Card className={classes.card}>I will become the filter</Card>
        </div>
    )
}

// Filter.propTypes = {}

export default Filter
