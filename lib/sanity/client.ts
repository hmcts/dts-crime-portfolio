import "server-only";

import { createClient, type SanityClient } from "@sanity/client";

const SANITY_API_VERSION = "2025-02-19";

export interface SanityClientConfig {
  projectId: string;
  dataset: string;
  token: string;
}

/**
 * Server-only Sanity client. Imports of this module from any code path that
 * ships to the browser fail at compile time thanks to `server-only`. The
 * client is lazily initialised so the build can complete in CI environments
 * where `SANITY_API_TOKEN` is not present.
 *
 * Spec: openspec/specs/access-control/spec.md (browser never writes), and
 * openspec/specs/change-tracking/spec.md (which assumes a single shared
 * client used by every API route).
 */
let cached: SanityClient | undefined;

export function getSanityClient(): SanityClient {
  if (cached) return cached;
  cached = createClient(readConfig());
  return cached;
}

export function resetSanityClient(): void {
  // Used by tests only.
  cached = undefined;
}

function readConfig() {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
  const token = process.env.SANITY_API_TOKEN;

  if (!projectId) {
    throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID must be set at runtime");
  }
  if (!dataset) {
    throw new Error("NEXT_PUBLIC_SANITY_DATASET must be set at runtime");
  }
  if (!token) {
    throw new Error("SANITY_API_TOKEN must be set at runtime for server-side Sanity access");
  }

  return {
    projectId,
    dataset,
    apiVersion: SANITY_API_VERSION,
    token,
    useCdn: false,
    perspective: "published" as const,
  };
}
