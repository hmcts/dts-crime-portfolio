import "server-only";

import type { SanityClient } from "@sanity/client";

import { getSanityClient } from "@/lib/sanity/client";

export interface ReferenceGroup {
  _id: string;
  name: string;
  pendingReview?: boolean;
}

export interface ReferenceDirectorate {
  _id: string;
  name: string;
  group: { _id: string; name: string } | null;
  pendingReview?: boolean;
}

export interface ReferenceBusinessArea {
  _id: string;
  name: string;
  pendingReview?: boolean;
}

export interface ReferencePerson {
  _id: string;
  name: string;
  email: string;
  pendingReview?: boolean;
}

export interface ReferenceCapability {
  _id: string;
  name: string;
  pendingReview?: boolean;
}

export interface ReferenceAction {
  _id: string;
  actionNo: string;
  name: string;
  strand: string;
}

export interface ReferenceData {
  groups: ReferenceGroup[];
  directorates: ReferenceDirectorate[];
  businessAreas: ReferenceBusinessArea[];
  people: ReferencePerson[];
  capabilities: ReferenceCapability[];
  actions: ReferenceAction[];
}

export type ReferenceCategory = keyof ReferenceData;

export class ReferenceDataFetchError extends Error {
  constructor(public readonly category: ReferenceCategory, cause: unknown) {
    super(`Failed to fetch reference category '${category}': ${describe(cause)}`);
    this.name = "ReferenceDataFetchError";
  }
}

function describe(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Fetch every dropdown source in parallel. Spec:
 * openspec/specs/reference-data/spec.md.
 *
 * `pendingReview != true` is applied to every user-creatable category
 * (group, directorate, businessArea, person, capability) by default.
 * Action documents are admin-managed and have no pendingReview field.
 */
export async function fetchReferenceData(
  options: { includePending?: boolean; client?: SanityClient } = {},
): Promise<ReferenceData> {
  const client = options.client ?? getSanityClient();
  const pendingFilter = options.includePending ? "" : "&& pendingReview != true";

  const fetchOrLabel = async <T>(category: ReferenceCategory, query: string): Promise<T> => {
    try {
      return await client.fetch<T>(query);
    } catch (cause) {
      throw new ReferenceDataFetchError(category, cause);
    }
  };

  const [groups, directorates, businessAreas, people, capabilities, actions] = await Promise.all([
    fetchOrLabel<ReferenceGroup[]>(
      "groups",
      `*[_type == "group" ${pendingFilter}] | order(name asc) { _id, name, pendingReview }`,
    ),
    fetchOrLabel<ReferenceDirectorate[]>(
      "directorates",
      `*[_type == "directorate" ${pendingFilter}] | order(name asc) {
        _id, name, pendingReview, "group": group->{ _id, name }
      }`,
    ),
    fetchOrLabel<ReferenceBusinessArea[]>(
      "businessAreas",
      `*[_type == "businessArea" ${pendingFilter}] | order(name asc) { _id, name, pendingReview }`,
    ),
    fetchOrLabel<ReferencePerson[]>(
      "people",
      `*[_type == "person" ${pendingFilter}] | order(name asc) { _id, name, email, pendingReview }`,
    ),
    fetchOrLabel<ReferenceCapability[]>(
      "capabilities",
      `*[_type == "capability" ${pendingFilter}] | order(name asc) { _id, name, pendingReview }`,
    ),
    fetchOrLabel<ReferenceAction[]>(
      "actions",
      `*[_type == "action"] | order(actionNo asc) { _id, actionNo, name, strand }`,
    ),
  ]);

  return { groups, directorates, businessAreas, people, capabilities, actions };
}

export async function fetchCapabilitiesOnly(
  options: { client?: SanityClient } = {},
): Promise<ReferenceCapability[]> {
  const client = options.client ?? getSanityClient();
  return client.fetch<ReferenceCapability[]>(
    `*[_type == "capability" && pendingReview != true] | order(name asc) { _id, name }`,
  );
}
