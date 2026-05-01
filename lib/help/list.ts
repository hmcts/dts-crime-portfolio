import "server-only";

import { getSanityClient } from "@/lib/sanity/client";

import type { FaqEntry } from "./types";

export type { FaqEntry, FaqSection } from "./types";
export {
  filterFaqEntries,
  groupFaqEntriesBySection,
  portableTextToPlain,
} from "./types";

const FAQ_QUERY = /* groq */ `
  *[_type == "faq"] | order(section asc, number asc) {
    _id,
    section,
    number,
    question,
    answer
  }
`;

export async function fetchFaqEntries(): Promise<FaqEntry[]> {
  const client = getSanityClient();
  return client.fetch<FaqEntry[]>(FAQ_QUERY);
}
