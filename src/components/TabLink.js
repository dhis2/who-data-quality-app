import React from 'react'
import propTypes from '@dhis2/prop-types'
import { useHistory, useLocation } from 'react-router-dom'
import { Tab } from '@dhis2/ui'

const TabLink = ({ to, children, exact }) => {
    const history = useHistory()
    const onClick = () => history.push(to)

    const { pathname } = useLocation()

    return (
        <Tab
            selected={exact ? pathname === to : pathname.startsWith(to)}
            onClick={onClick}
        >
            {children}
        </Tab>
    )
}

TabLink.propTypes = {
    children: propTypes.node,
    exact: propTypes.bool,
    to: propTypes.string,
}

export default TabLink
