import { useDataQuery } from '@dhis2/app-service-data'

const query = {
    me: {
        resource: 'me',
    },
}

const useAppDataQuery = () => {
    const { loading, error, data } = useDataQuery(query)

    return {
        loading,
        error,
        data: data
            ? {
                  userAuthorities: data.me.authorities,
              }
            : undefined,
    }
}

export default useAppDataQuery
