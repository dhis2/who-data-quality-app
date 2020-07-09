import React from 'react'
import propTypes from '@dhis2/prop-types'
import i18n from '@dhis2/d2-i18n'
import {
    OrganisationUnitTree,
    SingleSelectField,
    SingleSelectOption,
} from '@dhis2/ui'
import { useAppContext } from '../App/AppContext.js'

const OTHER_ID = '__OTHER__'

const getUniqueRootNodes = units => {
    const unitIdLookup = new Set(units.map(({ id }) => id))
    return units.reduce((acc, unit) => {
        if (!unit.ancestors.some(ancestor => unitIdLookup.has(ancestor.id))) {
            acc.push(unit.id)
        }
        return acc
    }, [])
}

const OrgUnitBoudary = ({ onChange, value, className }) => {
    const {
        userOrganisationUnits,
        userDataViewOrganisationUnits,
    } = useAppContext()

    const options = [
        ...userOrganisationUnits,
        { id: OTHER_ID, displayName: i18n.t('Other') },
    ]

    const onSelectChange = ({ selected }) => {
        if (selected === OTHER_ID) {
            onChange({
                id: OTHER_ID,
                path: null,
                displayName: null,
                isDataViewUnit: true,
            })
        } else {
            const option = options.find(({ id }) => selected === id)

            onChange({
                id: option.id,
                path: option.path,
                displayName: option.displayName,
                isDataViewUnit: false,
            })
        }
    }

    const onOrgUnitTreeChange = ({ id, displayName, path }) => {
        onChange({
            id,
            displayName,
            path,
            isDataViewUnit: true,
        })
    }

    const selectValue = value.isDataViewUnit ? OTHER_ID : value.id
    const orgTreeValue = value.path ? [value.path] : undefined

    return (
        <div className={className}>
            <SingleSelectField
                label={i18n.t('Organisation unit boundary')}
                onChange={onSelectChange}
                selected={selectValue}
            >
                {options.map(option => (
                    <SingleSelectOption
                        key={option.id}
                        label={option.displayName}
                        value={option.id}
                    />
                ))}
            </SingleSelectField>
            {selectValue === OTHER_ID && (
                <OrganisationUnitTree
                    roots={getUniqueRootNodes(userDataViewOrganisationUnits)}
                    onChange={onOrgUnitTreeChange}
                    singleSelection
                    selected={orgTreeValue}
                />
            )}
        </div>
    )
}

OrgUnitBoudary.propTypes = {
    onChange: propTypes.func.isRequired,
    className: propTypes.string,
    value: propTypes.object,
}

export default OrgUnitBoudary
