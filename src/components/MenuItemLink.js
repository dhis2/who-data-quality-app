import propTypes from '@dhis2/prop-types'
import { MenuItem } from '@dhis2/ui'
import React from 'react'
import { useHistory, useRouteMatch } from 'react-router-dom'

const MenuItemLink = ({ to, label }) => {
    const history = useHistory()
    const match = useRouteMatch(to)
    const onClick = () => history.push(to)

    return <MenuItem label={label} active={!!match} onClick={onClick} />
}

MenuItemLink.propTypes = {
    label: propTypes.string,
    to: propTypes.string,
}

export default MenuItemLink
