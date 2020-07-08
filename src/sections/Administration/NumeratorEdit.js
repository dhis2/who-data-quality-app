import React from 'react'

import { useParams } from 'react-router-dom'

import { useDataQuery } from '@dhis2/app-service-data'
import { useAllSettings } from '@dhis2/app-service-datastore'

import classes from './AdministrationSubSection.module.css'

const query = {
    dataElements: {
        resource: 'dataElements.json',
        params: {
            paging: false,
        },
    },
    indicators: {
        resource: 'indicators.json',
        params: {
            paging: false,
        },
    },
}

const NumeratorEdit = () => {
    const { code } = useParams()

    const [settings] = useAllSettings({ global: true })

    const { loading, error, data } = useDataQuery(query)

    if (loading) {
        //TODO: add loading spinner
        return null
    }

    const numerator = settings.numerators.find(
        numerator => numerator.code === code
    )
    const dataSet = settings.dataSets.find(ds => ds.id === numerator.dataSetID)

    let mapping = data.dataElements.dataElements.find(
        de => de.id === numerator.dataID
    )
    if (!mapping) {
        mapping = {
            ...data.indicators.indicators.find(
                ind => ind.id === numerator.dataID
            ),
            type: 'Indicator',
        }
    } else {
        mapping = { ...mapping, type: 'DataElement' }
    }

    //Expected features:
    //Toggle core true|false
    //Show name and definition

    //Data mapping
    //Select data element or indicator

    //Data set for completeness

    //Variable for completeness

    return (
        <div className={classes.subSection}>
            NumeratorEdit {code}
            <pre>{JSON.stringify(numerator, null, 2)}</pre>
            <pre>{JSON.stringify(dataSet, null, 2)}</pre>
            <pre>{JSON.stringify(mapping, null, 2)}</pre>
        </div>
    )
}

export default NumeratorEdit
