/**
 * Single GROQ query powering the /portfolio card grid. References are
 * resolved inline so the response is render-ready.
 *
 * Spec: openspec/specs/portfolio-management/spec.md (Portfolio card grid).
 */
export const PORTFOLIO_LIST_QUERY = /* groq */ `
  *[_type == "project"] | order(name asc) {
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
`;
