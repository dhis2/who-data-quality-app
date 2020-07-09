import React from 'react'
import propTypes from '@dhis2/prop-types'
import i18n from '@dhis2/d2-i18n'
import { SingleSelectField, SingleSelectOption } from '@dhis2/ui'

import useConfiguredGroups from '../hooks/useConfiguredGroups'

const DataSelect = ({ onChange, className, value }) => {
    const options = useConfiguredGroups()

    const onSelectChange = ({ selected }) => {
        const selectedOption = options.find(option => option.code === selected)
        onChange(selectedOption)
    }

    return (
        <SingleSelectField
            className={className}
            selected={value}
            onChange={onSelectChange}
            label={i18n.t('Data')}
        >
            {options.map(option => (
                <SingleSelectOption
                    key={option.code}
                    label={option.displayName}
                    value={option.code}
                />
            ))}
        </SingleSelectField>
    )
}

DataSelect.propTypes = {
    onChange: propTypes.func.isRequired,
    className: propTypes.string,
    value: propTypes.string,
}

export default DataSelect
