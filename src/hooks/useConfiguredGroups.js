import { useAllSettings } from '@dhis2/app-service-datastore'

export default function useConfiguredGroups() {
    /*
    A group has members, which are references to numerator codes.
    If a group has a member with a reference (via code) to at least
    one valid numerator it can be considered a configured group.
    A numerator is valid when it has a dataID
    */

    const [{ groups, numerators }] = useAllSettings({ global: true })

    return groups.reduce(
        (acc, group) => {
            const hasValidNumerator = numerators.some(
                numerator =>
                    numerator.dataID && group.members.includes(numerator.code)
            )
            if (hasValidNumerator) {
                acc.push(group)
            }
            return acc
        },
        [{ displayName: '[ Core ]', code: 'core' }]
    )
}
