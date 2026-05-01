import type { PortableTextBlock } from "@portabletext/types";

/**
 * Learning item types accepted by the Sanity schema. Mirror of
 * `sanity/schemas/documents/learningItem.ts`. Spec:
 * `openspec/specs/learning-hub/spec.md`.
 */
export const LEARNING_TYPES = ["video", "guide", "playlist"] as const;
export type LearningType = (typeof LEARNING_TYPES)[number];

export const LEARNING_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type LearningLevel = (typeof LEARNING_LEVELS)[number];

export function isLearningType(value: unknown): value is LearningType {
  return typeof value === "string" && (LEARNING_TYPES as readonly string[]).includes(value);
}

/**
 * Single learning item as projected from Sanity for the card grid and the
 * `/learning/[id]` placeholder. `body` is Portable Text rendered by the
 * shared renderer.
 */
export interface LearningItem {
  _id: string;
  type: LearningType;
  title: string;
  body: PortableTextBlock[] | null;
  tags: string[] | null;
  mediaUrl: string | null;
  readingTimeMinutes: number | null;
  level: LearningLevel | null;
  featured: boolean;
  createdAt: string;
}
