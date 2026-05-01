import "server-only";

import { getSanityClient } from "@/lib/sanity/client";
import {
  PROGRESS_STATUSES,
  type ProgressStatus,
} from "@/lib/enums/progress-status";

import {
  STRANDS,
  type ActionDetail,
  type ActionLinkedProject,
  type ActionListItem,
  type Strand,
  type StrandSummary,
} from "./types";

const ACTIONS_QUERY = /* groq */ `
  *[_type == "action"] | order(actionNo asc) {
    _id,
    actionNo,
    name,
    strand,
    priority,
    progressStatus,
    publishedStrategyUrl,
    "linkedProjectsCount": count(*[_type == "project" && references(^._id)])
  }
`;

const ACTION_DETAIL_QUERY = /* groq */ `
  *[_type == "action" && actionNo == $actionNo][0] {
    _id,
    actionNo,
    name,
    strand,
    priority,
    progressStatus,
    publishedStrategyUrl,
    description,
    summaryOfProgress,
    "linkedProjectsCount": count(*[_type == "project" && references(^._id)])
  }
`;

const LINKED_PROJECTS_QUERY = /* groq */ `
  *[_type == "project" && references($actionId)] | order(name asc) {
    _id,
    name,
    projectStage
  }
`;

export async function fetchActions(): Promise<ActionListItem[]> {
  const client = getSanityClient();
  return client.fetch<ActionListItem[]>(ACTIONS_QUERY);
}

export async function fetchActionByNumber(actionNo: string): Promise<ActionDetail | null> {
  const client = getSanityClient();
  return client.fetch<ActionDetail | null>(ACTION_DETAIL_QUERY, { actionNo });
}

export async function fetchLinkedProjects(actionId: string): Promise<ActionLinkedProject[]> {
  const client = getSanityClient();
  return client.fetch<ActionLinkedProject[]>(LINKED_PROJECTS_QUERY, { actionId });
}

/**
 * Group the action list by strand and count actions per progress status.
 * Spec: openspec/specs/action-plan-tracking/spec.md (Strand summary tiles).
 */
export function summariseByStrand(actions: ActionListItem[]): StrandSummary[] {
  return STRANDS.map((strand) => {
    const inStrand = actions.filter((action) => action.strand === strand);
    const counts = PROGRESS_STATUSES.reduce(
      (acc, status) => {
        acc[status] = inStrand.filter((action) => action.progressStatus === status).length;
        return acc;
      },
      {} as Record<ProgressStatus, number>,
    );
    return { strand, counts, total: inStrand.length };
  });
}

export function groupActionsByStrand(actions: ActionListItem[]): Record<Strand, ActionListItem[]> {
  const groups: Record<Strand, ActionListItem[]> = {
    "1. Foundations": [],
    "2. Embed": [],
    "3. People & Partners": [],
  };
  for (const action of actions) {
    if (action.strand in groups) {
      groups[action.strand as Strand].push(action);
    }
  }
  return groups;
}
