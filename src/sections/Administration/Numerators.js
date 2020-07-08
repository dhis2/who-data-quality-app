import React from 'react'
import { Link } from 'react-router-dom'

import i18n from '@dhis2/d2-i18n'
import { useAllSettings } from '@dhis2/app-service-datastore'

import classes from './AdministrationSubSection.module.css'
import { useDataQuery } from '@dhis2/app-service-data'

import { PATHS } from './Administration.js'

import {
    Table,
    TableHead,
    TableRowHead,
    TableCell,
    TableCellHead,
    TableBody,
    TableRow,
    Button,
} from '@dhis2/ui'

export const createDataElementIndicatorQuery = ids => ({
    dataElements: {
        resource: 'dataElements.json',
        params: {
            filter: `id:in:[${ids.join(',')}]`,
            paging: false,
        },
    },
    indicators: {
        resource: 'indicators.json',
        params: {
            filter: `id:in:[${ids.join(',')}]`,
            paging: false,
        },
    },
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

const addMapping = ({ numerators, items }) => {
    numerators.map(numerator => {
        let mappedItemName = ''
        let mappedItemType = ''

        if (numerator.dataID !== null) {
            const mappedItem = items.find(el => numerator.dataID === el.id)
            mappedItemName = mappedItem.displayName
            mappedItemType = mappedItem.type
        }

        numerator.mappedItem = {
            name: mappedItemName,
            type: mappedItemType,
        }
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
        const { loading, data } = useDataQuery(
            createDataElementIndicatorQuery(dataElementIds)
        )

        if (!loading && data) {
            const { dataElements, indicators } = data
            const items = dataElements.dataElements
                .map(de => ({ ...de, type: i18n.t('Data Element') }))
                .concat(
                    indicators.indicators.map(ind => ({
                        ...ind,
                        type: i18n.t('Indicator'),
                    }))
                )
            addMapping({
                numerators,
                items,
            })
        } else if (loading) {
            //TODO: add loading
            return null
        }
    }

    const createEditLink = code => PATHS.NUMERATOR_EDIT.replace(':code', code)

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
                        <TableCellHead>{i18n.t('Mapping')}</TableCellHead>
                        <TableCellHead>{i18n.t('Mapping type')}</TableCellHead>
                        <TableCellHead>{i18n.t('Dataset')}</TableCellHead>
                        <TableCellHead></TableCellHead>
                    </TableRowHead>
                </TableHead>
                <TableBody>
                    {numerators.map(numerator => (
                        <TableRow key={numerator.code}>
                            <TableCell>{numerator.groupName}</TableCell>
                            <TableCell>{numerator.name}</TableCell>
                            <TableCell>{numerator.core}</TableCell>
                            <TableCell>{numerator.mappedItem.name}</TableCell>
                            <TableCell>{numerator.mappedItem.type}</TableCell>
                            <TableCell>{numerator.dataSetName}</TableCell>
                            <TableCell>
                                <Link to={createEditLink(numerator.code)}>
                                    <Button small>{i18n.t('Edit')}</Button>
                                </Link>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default Numerators
