/**
 * Server-side filtered portfolio query. Each filter parameter is empty-safe
 * (`count($x) == 0` short-circuits) so the same query handles "no filters"
 * and any subset of active filters without a code branch.
 *
 * The aggregated `{ total, filtered }` shape is one round-trip and powers
 * the "Showing X of Y projects" summary.
 *
 * Spec: openspec/specs/portfolio-management/spec.md.
 */
export const PORTFOLIO_LIST_QUERY = /* groq */ `
  {
    "total": count(*[_type == "project"]),
    "filtered": *[_type == "project"
      && (count($stages) == 0 || projectStage in $stages)
      && (count($groupIds) == 0 || group._ref in $groupIds)
      && (count($directorateIds) == 0 || directorate._ref in $directorateIds)
      && (count($businessAreaIds) == 0 || count(businessAreas[@._ref in $businessAreaIds]) > 0)
      && (count($ownerIds) == 0 || deliveryOwner._ref in $ownerIds)
      && (count($capabilityIds) == 0 || capability._ref in $capabilityIds)
      && (count($tiers) == 0 || governanceTier in $tiers)
      && (count($actionIds) == 0 || count(actionPlanLinks[@._ref in $actionIds]) > 0)
      && ($search == "" || (name match $searchToken || description match $searchToken))
    ] | order(name asc) {
      _id,
      name,
      description,
      projectStage,
      "group": group->name,
      "directorate": directorate->name,
      "businessAreas": businessAreas[]->name,
      "capability": capability->name,
      "deliveryOwner": deliveryOwner->{ name, email },
      "linkedActionsCount": count(actionPlanLinks),
      lastUpdatedAt
    }
  }
`;
