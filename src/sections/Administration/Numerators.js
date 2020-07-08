import React from 'react'

import i18n from '@dhis2/d2-i18n'
import { useAllSettings } from '@dhis2/app-service-datastore'

import classes from './AdministrationSubSection.module.css'
import { useDataQuery } from '@dhis2/app-service-data'

import {
    Table,
    TableHead,
    TableRowHead,
    TableCell,
    TableCellHead,
    TableBody,
    TableRow,
} from '@dhis2/ui'

const makeQuery = ids => ({
    dataElements: {
        resource: 'dataElements.json',
        params: {
            filter: `id:in:[${ids.join(',')}]`,
            paging: false,
        },
    },
    /*dataSets: {
        resource: 'dataSets.json',
        params: {
            fields: 'displayName,id',
            filter: `dataSetElements.dataElement.id:in:[${ids.join(',')}]`,
            paging: false,
        },
    },*/
})

const transformConfig = config =>
    config.groups
        .map(group => {
            const members = config.numerators.filter(numerator =>
                group.members.some(code => code === numerator.code)
            )

            return members.map(member => {
                const core = config.coreIndicators.some(
                    code => code === member.code
                )
                    ? i18n.t('Yes')
                    : ''

                if (member.dataSetID) {
                    member.dataSetName = config.dataSets.find(
                        ds => ds.id === member.dataSetID
                    )?.name
                }

                return {
                    ...member,
                    core,
                    groupName: group.displayName,
                }
            })
        })
        .flat()
        .sort(
            (a, b) =>
                a.groupName.localeCompare(b.groupName) ||
                a.name.localeCompare(b.name)
        )

const addDataElements = ({ numerators, dataElements }) => {
    numerators.map(numerator => {
        let dataElementName = ''
        if (numerator.dataID !== null) {
            const dataElement = dataElements.find(
                el => numerator.dataID === el.id
            )
            dataElementName = dataElement.displayName
        }

        numerator.dataElementName = dataElementName
    })
}

const Numerators = () => {
    const [settings] = useAllSettings({ global: true })

    const isConfigured = settings?.numerators?.some(
        numerator => numerator.dataID !== null
    )

    const numerators = transformConfig(settings)

    const dataElementIds =
        numerators.filter(n => n.dataID !== null).map(n => n.dataID) ?? []

    if (isConfigured) {
        //TODO: handle error
        const { loading, data } = useDataQuery(makeQuery(dataElementIds))

        if (!loading && data) {
            addDataElements({
                numerators,
                dataElements: data.dataElements.dataElements,
            })
        }
    }

    return (
        <div className={classes.subSection}>
            <p>
                {i18n.t(
                    'Please map the reference numerators to the corresponding data element/indicator in this database.'
                )}
            </p>
            <Table dataTest="who-administration-numerators">
                <TableHead>
                    <TableRowHead>
                        <TableCellHead>{i18n.t('Group')}</TableCellHead>
                        <TableCellHead>
                            {i18n.t('Reference numerator')}
                        </TableCellHead>
                        <TableCellHead>{i18n.t('Core')}</TableCellHead>
                        <TableCellHead>
                            {i18n.t('Data element/indicator')}
                        </TableCellHead>
                        <TableCellHead>{i18n.t('Dataset')}</TableCellHead>
                    </TableRowHead>
                </TableHead>
                <TableBody>
                    {numerators.map(numerator => (
                        <TableRow key={numerator.code}>
                            <TableCell>{numerator.groupName}</TableCell>
                            <TableCell>{numerator.name}</TableCell>
                            <TableCell>{numerator.core}</TableCell>
                            <TableCell>{numerator.dataElementName}</TableCell>
                            <TableCell>{numerator.dataSetName}</TableCell>
                            <TableCell></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default Numerators
