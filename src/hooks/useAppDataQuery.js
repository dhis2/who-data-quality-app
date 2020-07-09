import { useDataQuery } from '@dhis2/app-service-data'

const query = {
    me: {
        resource: 'me',
        params: {
            fields: [
                'authorities',
                'organisationUnits[id,displayName,path]',
                'dataViewOrganisationUnits[id,displayName,ancestors,path]',
                'dataSets',
            ],
        },
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
                  userOrganisationUnits: data.me.organisationUnits,
                  userDataViewOrganisationUnits:
                      data.me.dataViewOrganisationUnits,
                  userDataSets: data.me.dataSets,
              }
            : undefined,
    }
}

export default useAppDataQuery
