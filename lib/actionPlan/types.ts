import type { PortableTextBlock } from "@portabletext/types";

import type { Stage } from "@/lib/enums/stage";
import type { ProgressStatus } from "@/lib/enums/progress-status";

export const STRANDS = [
  "1. Foundations",
  "2. Embed",
  "3. People & Partners",
] as const;

export type Strand = (typeof STRANDS)[number];

export const STRAND_DISPLAY: Record<Strand, string> = {
  "1. Foundations": "1. Strengthen our Foundations",
  "2. Embed": "2. Embed AI across the Justice System",
  "3. People & Partners": "3. Invest in our people and partners",
};

export interface ActionListItem {
  _id: string;
  actionNo: string;
  name: string;
  strand: Strand;
  priority: string | null;
  progressStatus: ProgressStatus;
  publishedStrategyUrl: string | null;
  linkedProjectsCount: number;
}

export interface ActionDetail extends ActionListItem {
  description: string | null;
  summaryOfProgress: PortableTextBlock[] | null;
}

export interface ActionLinkedProject {
  _id: string;
  name: string;
  projectStage: Stage;
}

export interface StrandSummary {
  strand: Strand;
  counts: Record<ProgressStatus, number>;
  total: number;
}
