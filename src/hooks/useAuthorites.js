import { useEffect, useState } from 'react'
import { useDataQuery } from '@dhis2/app-service-data'

const query = {
    me: {
        resource: 'me',
    },
}

const useAuthorites = (authorities, defaultValue = false) => {
    const { loading, error, data } = useDataQuery(query)

    const [hasAnyAuthority, setHasAnyAuthority] = useState(defaultValue)
    const [hasAllAuthorities, setHasAllAuthorities] = useState(defaultValue)

    useEffect(() => {
        if (!loading) {
            if (data && data.me && data.me.authorities) {
                const filter = data.me.authorities.filter(auth =>
                    authorities.includes(auth)
                )
                setHasAnyAuthority(filter.length > 0)
                setHasAllAuthorities(filter.length === authorities.length)
            }
        }
    }, [loading])

    return { loading, error, hasAnyAuthority, hasAllAuthorities }
}

export default useAuthorites
