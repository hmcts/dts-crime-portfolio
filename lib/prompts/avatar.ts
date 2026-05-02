/**
 * Helpers for rendering the avatar circle on prompt cards and inside
 * the comments modal. The card design uses a coloured circle bearing
 * the author's initials. To keep the same author rendering in the
 * same colour family across the page, we hash a stable seed (the
 * author's `_id` if available, otherwise the display name) into a
 * fixed palette.
 *
 * Email is intentionally NOT used as the seed — the listing surface
 * never sees author email, and falling back to the display name
 * keeps the rule deterministic without coupling avatar colour to a
 * private value.
 */

import type { PromptComment, PromptListItem } from "./types";

/**
 * Produce up-to-two uppercase initials from a display name. First
 * letter of the first word + first letter of the last word; for a
 * single-word name we just use that initial.
 */
export function initialsFromName(name: string | null | undefined): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    return parts[0]!.slice(0, 1).toUpperCase();
  }
  const first = parts[0]!.slice(0, 1);
  const last = parts[parts.length - 1]!.slice(0, 1);
  return (first + last).toUpperCase();
}

/**
 * Curated palette of avatar background/foreground pairs. The hashing
 * function picks one deterministically per author so the same author
 * always lands on the same colour.
 */
const AVATAR_PALETTE: ReadonlyArray<{ bg: string; fg: string }> = [
  { bg: "bg-rose-200", fg: "text-rose-900" },
  { bg: "bg-amber-200", fg: "text-amber-900" },
  { bg: "bg-lime-200", fg: "text-lime-900" },
  { bg: "bg-emerald-200", fg: "text-emerald-900" },
  { bg: "bg-teal-200", fg: "text-teal-900" },
  { bg: "bg-sky-200", fg: "text-sky-900" },
  { bg: "bg-indigo-200", fg: "text-indigo-900" },
  { bg: "bg-violet-200", fg: "text-violet-900" },
  { bg: "bg-fuchsia-200", fg: "text-fuchsia-900" },
  { bg: "bg-orange-200", fg: "text-orange-900" },
  { bg: "bg-cyan-200", fg: "text-cyan-900" },
  { bg: "bg-pink-200", fg: "text-pink-900" },
];

/**
 * Tiny deterministic hash. djb2-style; not cryptographic — we only
 * need stable bucket selection across renders/sessions.
 */
function djb2(input: string): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return h >>> 0;
}

/**
 * Pick a palette entry from a stable seed string. Never returns the
 * neutral fallback unless the seed is empty — every named author
 * lands on a real colour.
 */
export function avatarColourFor(seed: string | null | undefined): { bg: string; fg: string } {
  const safe = (seed ?? "").trim();
  if (!safe) return { bg: "bg-neutral-200", fg: "text-neutral-700" };
  const index = djb2(safe.toLowerCase()) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index]!;
}

/**
 * The card and modal use the author's `_id` (a stable, opaque value)
 * as the seed when available, falling back to the display name.
 * Anything is fine as long as repeat authors get the same value.
 */
export function avatarSeedFor(
  entity: Pick<PromptListItem | PromptComment, "authorName" | "authorSeed">,
): string {
  return entity.authorSeed ?? entity.authorName ?? "";
}
