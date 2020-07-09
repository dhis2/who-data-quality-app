import i18n from '@dhis2/d2-i18n'
import { useAppContext } from '../App/AppContext.js'
import {
    DASHBOARD_FILTER_KEYS as FILTER_KEYS,
    CORE_DATA_GROUP,
} from '../config'

const getLocalisedMonthName = date => {
    const monthNames = [
        i18n.t('January'),
        i18n.t('February'),
        i18n.t('March'),
        i18n.t('April'),
        i18n.t('May'),
        i18n.t('June'),
        i18n.t('July'),
        i18n.t('August'),
        i18n.t('September'),
        i18n.t('October'),
        i18n.t('November'),
        i18n.t('December'),
    ]
    return monthNames[date.getMonth()]
}

export default function useInitialFilterState() {
    const { userOrganisationUnits } = useAppContext()
    const today = new Date()

    return {
        [FILTER_KEYS.DATA]: CORE_DATA_GROUP,
        [FILTER_KEYS.PERIOD]: {
            id: `${today.getFullYear()}${today.getMonth() + 1}`,
            displayName: getLocalisedMonthName(today),
        },
        [FILTER_KEYS.ORG_UNIT_BOUNDARY]: {
            id: userOrganisationUnits[0].id,
            displayName: userOrganisationUnits[0].displayName,
            path: userOrganisationUnits[0].path,
            isDataViewUnit: false,
        },
        // Not sure about this part yet
        [FILTER_KEYS.DISSAGREGATION_LEVEL]: '',
    }
}
