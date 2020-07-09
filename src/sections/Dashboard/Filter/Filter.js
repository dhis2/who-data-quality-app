import React from 'react'
import propTypes from '@dhis2/prop-types'
import { Card, InputField } from '@dhis2/ui'

import classes from './Filter.module.css'
import DataSelect from '../../../components/DataSelect.js'
import OrgUnitBoundary from '../../../components/OrgUnitBoundary.js'
import DisaggregationLevel from '../../../components/DisaggregationLevel.js'
import { DASHBOARD_FILTER_KEYS as FILTER_KEYS } from '../../../config'

const Filter = ({ config, update }) => {
    const updateByKey = (key, value) =>
        update({
            ...config,
            [key]: value,
        })

    console.log('filter config:\n', JSON.stringify(config, null, 4))

    return (
        <div className={classes.container}>
            <Card className={classes.card}>
                <DataSelect
                    className={classes.segment}
                    value={config[FILTER_KEYS.DATA]?.code}
                    onChange={updateByKey.bind(null, FILTER_KEYS.DATA)}
                />
                <InputField
                    className={classes.segment}
                    label="I will be replaced by the FixedPeriodSelect"
                />
                <OrgUnitBoundary
                    className={classes.segment}
                    value={config[FILTER_KEYS.ORG_UNIT_BOUNDARY]}
                    onChange={updateByKey.bind(
                        null,
                        FILTER_KEYS.ORG_UNIT_BOUNDARY
                    )}
                />
                <DisaggregationLevel />
            </Card>
        </div>
    )
}

Filter.propTypes = {
    config: propTypes.object.isRequired,
    update: propTypes.func.isRequired,
}

export default Filter
