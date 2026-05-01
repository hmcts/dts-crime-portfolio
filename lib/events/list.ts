import "server-only";

import type { PortableTextBlock } from "@portabletext/types";

import { getSanityClient } from "@/lib/sanity/client";

import type { EventsFilters } from "./filters";

/**
 * Single event row for the listing page. Body is omitted from the list
 * query — only the detail query loads Portable Text — but the title and
 * body are both searchable via GROQ on the server.
 *
 * Spec: openspec/specs/events-listing/spec.md (Default view + Filters).
 */
export interface EventListItem {
  _id: string;
  title: string;
  category: string | null;
  location: string | null;
  startsAt: string;
  endsAt: string;
}

export interface EventDetail extends EventListItem {
  body: PortableTextBlock[] | null;
}

export interface EventsListResponse {
  events: EventListItem[];
  categories: string[];
  locations: string[];
}

const EVENTS_LIST_QUERY = /* groq */ `
  {
    "events": *[_type == "event"
      && defined(endsAt)
      && dateTime(endsAt) > dateTime(now())
      && ($category == "" || category == $category)
      && ($location == "" || location == $location)
      && (
        $search == ""
        || title match $searchToken
        || pt::text(body) match $searchToken
      )
    ] | order(startsAt asc) {
      _id,
      title,
      category,
      location,
      startsAt,
      endsAt
    },
    "categories": array::unique(
      *[_type == "event" && defined(category) && defined(endsAt) && dateTime(endsAt) > dateTime(now())].category
    ) | order(@ asc),
    "locations": array::unique(
      *[_type == "event" && defined(location) && defined(endsAt) && dateTime(endsAt) > dateTime(now())].location
    ) | order(@ asc)
  }
`;

const EVENT_DETAIL_QUERY = /* groq */ `
  *[_type == "event" && _id == $id][0] {
    _id,
    title,
    category,
    location,
    startsAt,
    endsAt,
    body
  }
`;

export async function listEvents(filters: EventsFilters): Promise<EventsListResponse> {
  const client = getSanityClient();
  return client.fetch<EventsListResponse>(EVENTS_LIST_QUERY, {
    category: filters.category,
    location: filters.location,
    search: filters.search,
    searchToken: filters.search ? `*${filters.search}*` : "",
  });
}

export async function fetchEventById(id: string): Promise<EventDetail | null> {
  const client = getSanityClient();
  return client.fetch<EventDetail | null>(EVENT_DETAIL_QUERY, { id });
}
