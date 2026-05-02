/**
 * Seed the preview Sanity dataset with realistic HMCTS DTS Crime demo data.
 *
 * Why this exists: the Product Manager needs to *see* the product alive
 * before doing a KEEP/KILL pass on capabilities. Empty surfaces let cuts
 * happen by accident; populated surfaces force a real decision.
 *
 * Usage:
 *   SANITY_API_TOKEN=<editor-scope-token> pnpm seed:demo
 *   SANITY_API_TOKEN=<token> pnpm seed:demo --dry-run
 *
 * Idempotent on re-run: every document uses a deterministic `_id` and is
 * written via `createOrReplace`, so the script can be run repeatedly while
 * iterating on the demo content. Refuses to run against the production
 * dataset.
 */

import { createClient, type SanityClient } from "@sanity/client";
import type { PortableTextBlock } from "@portabletext/types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "vi5mhbtl";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "preview";
const TOKEN = process.env.SANITY_API_TOKEN;
const API_VERSION = "2025-02-19";

const DRY_RUN = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

interface SanityDoc {
  _id: string;
  _type: string;
  [key: string]: unknown;
}

function ref(id: string): { _type: "reference"; _ref: string } {
  return { _type: "reference", _ref: id };
}

function refsOf(ids: string[]): Array<{
  _type: "reference";
  _ref: string;
  _key: string;
}> {
  return ids.map((id, i) => ({ _type: "reference", _ref: id, _key: `${id}-${i}` }));
}

function block(text: string): PortableTextBlock {
  return {
    _type: "block",
    _key: hash(text).slice(0, 12),
    style: "normal",
    markDefs: [],
    children: [
      { _type: "span", _key: hash(text + ":span").slice(0, 12), text, marks: [] },
    ],
  };
}

function portableText(...paragraphs: string[]): PortableTextBlock[] {
  return paragraphs.map(block);
}

function hash(input: string): string {
  // Tiny deterministic hash so re-runs produce stable _key values.
  let h = 0n;
  for (const ch of input) {
    h = (h * 131n + BigInt(ch.charCodeAt(0))) & 0xffffffffffffffffn;
  }
  return h.toString(16).padStart(16, "0");
}

function daysAgo(days: number, hour = 9): string {
  const d = new Date();
  d.setUTCHours(hour, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function daysAhead(days: number, hour = 14): string {
  return daysAgo(-days, hour);
}

function group(
  docs: SanityDoc[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const d of docs) {
    counts.set(d._type, (counts.get(d._type) ?? 0) + 1);
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

// Groups
const G_CRIME = "demo-group-crime";
const G_FAMILY = "demo-group-family";
const G_CIVIL = "demo-group-civil";
const G_TRIB = "demo-group-tribunals";

const groups: SanityDoc[] = [
  { _id: G_CRIME, _type: "group", name: "Crime" },
  { _id: G_FAMILY, _type: "group", name: "Family" },
  { _id: G_CIVIL, _type: "group", name: "Civil" },
  { _id: G_TRIB, _type: "group", name: "Tribunals" },
];

// Directorates
const D_CRIME_TECH = "demo-dir-crime-tech";
const D_CRIME_SD = "demo-dir-crime-sd";
const D_CRIME_OPS = "demo-dir-crime-ops";
const D_FAMILY_TECH = "demo-dir-family-tech";
const D_CIVIL_TECH = "demo-dir-civil-tech";
const D_TRIB_TECH = "demo-dir-tribunals-tech";

const directorates: SanityDoc[] = [
  { _id: D_CRIME_TECH, _type: "directorate", name: "Crime Tech", group: ref(G_CRIME) },
  { _id: D_CRIME_SD, _type: "directorate", name: "Crime Service Design", group: ref(G_CRIME) },
  { _id: D_CRIME_OPS, _type: "directorate", name: "Crime Operations", group: ref(G_CRIME) },
  { _id: D_FAMILY_TECH, _type: "directorate", name: "Family Tech", group: ref(G_FAMILY) },
  { _id: D_CIVIL_TECH, _type: "directorate", name: "Civil Tech", group: ref(G_CIVIL) },
  { _id: D_TRIB_TECH, _type: "directorate", name: "Tribunals Tech", group: ref(G_TRIB) },
];

// Business areas
const BA = {
  crown: "demo-ba-crown-court",
  mags: "demo-ba-magistrates",
  probation: "demo-ba-probation",
  victims: "demo-ba-victims",
  ops: "demo-ba-court-ops",
  listings: "demo-ba-listings",
  sentencing: "demo-ba-sentencing",
  bail: "demo-ba-bail",
} as const;

const businessAreas: SanityDoc[] = [
  { _id: BA.crown, _type: "businessArea", name: "Crown Court" },
  { _id: BA.mags, _type: "businessArea", name: "Magistrates' Court" },
  { _id: BA.probation, _type: "businessArea", name: "Probation" },
  { _id: BA.victims, _type: "businessArea", name: "Victims Support" },
  { _id: BA.ops, _type: "businessArea", name: "Court Operations" },
  { _id: BA.listings, _type: "businessArea", name: "Listings" },
  { _id: BA.sentencing, _type: "businessArea", name: "Sentencing" },
  { _id: BA.bail, _type: "businessArea", name: "Bail" },
];

// Capabilities
const CAP = {
  summarisation: "demo-cap-summarisation",
  transcription: "demo-cap-transcription",
  translation: "demo-cap-translation",
  ocr: "demo-cap-ocr",
  search: "demo-cap-search",
  classification: "demo-cap-classification",
  anomaly: "demo-cap-anomaly",
  forecasting: "demo-cap-forecasting",
  decision: "demo-cap-decision-support",
  routing: "demo-cap-routing",
  sentiment: "demo-cap-sentiment",
  entity: "demo-cap-entity-extraction",
} as const;

const capabilities: SanityDoc[] = [
  { _id: CAP.summarisation, _type: "capability", name: "Summarisation" },
  { _id: CAP.transcription, _type: "capability", name: "Transcription" },
  { _id: CAP.translation, _type: "capability", name: "Translation" },
  { _id: CAP.ocr, _type: "capability", name: "OCR" },
  { _id: CAP.search, _type: "capability", name: "Search" },
  { _id: CAP.classification, _type: "capability", name: "Document classification" },
  { _id: CAP.anomaly, _type: "capability", name: "Anomaly detection" },
  { _id: CAP.forecasting, _type: "capability", name: "Forecasting" },
  { _id: CAP.decision, _type: "capability", name: "Decision support" },
  { _id: CAP.routing, _type: "capability", name: "Routing" },
  { _id: CAP.sentiment, _type: "capability", name: "Sentiment" },
  { _id: CAP.entity, _type: "capability", name: "Entity extraction" },
];

// People (plausible-but-fictional pool)
const P = {
  alice: "demo-person-alice-owner",
  ben: "demo-person-ben-director",
  cara: "demo-person-cara-lead",
  dav: "demo-person-dav-sro",
  eli: "demo-person-eli-assurance",
  fern: "demo-person-fern-product",
  gita: "demo-person-gita-portfolio",
  harry: "demo-person-harry-risk",
} as const;

const people: SanityDoc[] = [
  { _id: P.alice, _type: "person", name: "Alice Owner", email: "alice.owner@hmcts.net" },
  { _id: P.ben, _type: "person", name: "Ben Director", email: "ben.director@justice.gov.uk" },
  { _id: P.cara, _type: "person", name: "Cara Lead", email: "cara.lead@hmcts.net" },
  { _id: P.dav, _type: "person", name: "Dav SRO", email: "dav.sro@justice.gov.uk" },
  { _id: P.eli, _type: "person", name: "Eli Assurance", email: "eli.assurance@hmcts.net" },
  { _id: P.fern, _type: "person", name: "Fern Product", email: "fern.product@hmcts.net" },
  { _id: P.gita, _type: "person", name: "Gita Portfolio", email: "gita.portfolio@justice.gov.uk" },
  { _id: P.harry, _type: "person", name: "Harry Risk", email: "harry.risk@hmcts.net" },
];

// Actions (action plan strands). Schema requires actionNo, name, strand, progressStatus.
const A = {
  listings: "demo-action-listings",
  victims: "demo-action-victims",
  bundles: "demo-action-bundles",
  audit: "demo-action-audit",
} as const;

const actions: SanityDoc[] = [
  {
    _id: A.listings,
    _type: "action",
    actionNo: "1.2",
    name: "Reduce time-to-listing",
    strand: "1. Foundations",
    priority: "High",
    description:
      "Shorten the cycle from charge to first hearing by improving listings " +
      "visibility, court-by-court forecasting, and clerk workflows.",
    progressStatus: "Significant progress",
    summaryOfProgress: portableText(
      "Forecasting pilot live in three Magistrates' courts; listings backlog down 12% vs the same period last year.",
      "Next: extend to Crown Court Listings; integrate with the rota optimisation strand.",
    ),
  },
  {
    _id: A.victims,
    _type: "action",
    actionNo: "2.4",
    name: "Improve victim notification cycle",
    strand: "2. Embed",
    priority: "High",
    description:
      "Modernise the victim notification pipeline so victims hear about " +
      "case progression via the channel they prefer, on time.",
    progressStatus: "Some progress",
    summaryOfProgress: portableText(
      "Pipeline rewrite scoped; pilot scheduled for two Crown Court regions next quarter.",
    ),
  },
  {
    _id: A.bundles,
    _type: "action",
    actionNo: "2.6",
    name: "Modernise jury bundle workflow",
    strand: "2. Embed",
    priority: "Medium",
    description:
      "Reduce time spent by jurors and judges navigating thousand-page " +
      "bundles by introducing assistive summarisation and indexing.",
    progressStatus: "Significant progress",
    summaryOfProgress: portableText(
      "Two Crown Court trials onboarded to the triage pilot; bundle navigation time down 38% in user testing.",
      "Risk: long-form summarisation accuracy needs Tier 2 assurance sign-off before scale.",
    ),
  },
  {
    _id: A.audit,
    _type: "action",
    actionNo: "3.1",
    name: "Strengthen court audit trail",
    strand: "3. People & Partners",
    priority: "Medium",
    description:
      "Ensure every decision-support touchpoint writes a tamper-evident " +
      "audit row that legal teams can review at appeal.",
    progressStatus: "Some progress",
    summaryOfProgress: portableText(
      "Bail decision-support audit-row schema agreed with HMCTS Legal; implementation begins this sprint.",
    ),
  },
];

// ---------------------------------------------------------------------------
// Projects (12 across the stage spectrum). Schema stages are
// idea | scan | pilot | scale | stalled | sunset.
// ---------------------------------------------------------------------------

interface ProjectInput {
  id: string;
  name: string;
  description: string;
  stage: "idea" | "scan" | "pilot" | "scale" | "stalled" | "sunset";
  directorate: string;
  businessAreas: string[];
  primaryCapability: string;
  additionalCapabilities?: string[];
  deliveryOwner: string;
  businessLead?: string;
  legalLead?: string;
  actions?: string[];
  governanceTier: 1 | 2 | 3;
  governanceBody?: string;
  riskRegister?: "yes" | "no" | "unknown";
  dpiaInPlace?: "complete" | "in-progress" | "not-required" | "missing";
  actsInPlace?: "complete" | "in-progress" | "not-required" | "missing";
  ethics?: "yes" | "no" | "in-progress" | "unknown";
  supplier?: string;
  userCount?: number;
  funding?: string;
  containsPii?: boolean;
  lastUpdatedDaysAgo: number;
  updates: Array<{ title: string; body: string[]; daysAgo: number; author: string }>;
  // Tier answers — at least the "max" needs to match governanceTier.
  tieringAnswers: Partial<{
    natureOfApplication: 1 | 2 | 3;
    reach: 1 | 2 | 3;
    thirdPartyInvolvement: 1 | 2 | 3;
    ownership: 1 | 2 | 3;
    publicTrustImplications: 1 | 2 | 3;
    legalRegulatoryImplications: 1 | 2 | 3;
    technicalComplexity: 1 | 2 | 3;
    automatedDecisionMaking: 1 | 2 | 3;
    typeOfData: 1 | 2 | 3;
    dataStorage: 1 | 2 | 3;
  }>;
}

const projectInputs: ProjectInput[] = [
  // idea (2)
  {
    id: "demo-proj-witness-anxiety",
    name: "Pre-court witness anxiety screening",
    description:
      "Idea-stage exploration of giving witnesses a low-friction self-screen " +
      "for anxiety markers ahead of giving evidence, so Court Operations can " +
      "flag who might benefit from early intermediary support.",
    stage: "idea",
    directorate: D_CRIME_SD,
    businessAreas: [BA.victims, BA.ops],
    primaryCapability: CAP.sentiment,
    deliveryOwner: P.fern,
    businessLead: P.cara,
    governanceTier: 3,
    riskRegister: "unknown",
    dpiaInPlace: "missing",
    actsInPlace: "missing",
    ethics: "unknown",
    funding: "Discovery — internal",
    containsPii: true,
    lastUpdatedDaysAgo: 32,
    actions: [A.victims],
    updates: [
      {
        title: "Concept note circulated",
        body: [
          "Concept note shared with Crime Service Design and Victims Support.",
          "Open question: would intermediary teams have capacity to act on flags? Booking a session with the witness service lead.",
        ],
        daysAgo: 32,
        author: P.fern,
      },
    ],
    tieringAnswers: { typeOfData: 3, publicTrustImplications: 3, automatedDecisionMaking: 2 },
  },
  {
    id: "demo-proj-clerk-knowledge",
    name: "Court-clerk knowledge base assistant",
    description:
      "Lightweight assistant that answers court clerks' procedural questions " +
      "(listings rules, adjournment policy, bail clauses) from the existing " +
      "HMCTS internal knowledge base, with citations.",
    stage: "idea",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.ops, BA.listings],
    primaryCapability: CAP.search,
    additionalCapabilities: [CAP.summarisation],
    deliveryOwner: P.alice,
    businessLead: P.cara,
    governanceTier: 2,
    riskRegister: "no",
    dpiaInPlace: "not-required",
    actsInPlace: "missing",
    ethics: "in-progress",
    funding: "FY26 discovery pot",
    containsPii: false,
    lastUpdatedDaysAgo: 18,
    updates: [
      {
        title: "Idea logged after clerks' show & tell",
        body: [
          "Six clerks across two Crown Court centres voted this their #1 pain point: 'I spend 20 minutes hunting the right policy clause every time'.",
        ],
        daysAgo: 18,
        author: P.alice,
      },
    ],
    tieringAnswers: { reach: 2, technicalComplexity: 2 },
  },

  // scan / discovery (2)
  {
    id: "demo-proj-listings-forecasting",
    name: "Magistrates' court listings forecasting",
    description:
      "Discovery into forecasting Magistrates' court daily listings load so " +
      "Listings teams can rebalance courtrooms and ushers ahead of demand " +
      "spikes.",
    stage: "scan",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.listings, BA.mags],
    primaryCapability: CAP.forecasting,
    deliveryOwner: P.alice,
    businessLead: P.cara,
    legalLead: P.harry,
    governanceTier: 2,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "yes",
    dpiaInPlace: "in-progress",
    actsInPlace: "in-progress",
    ethics: "in-progress",
    supplier: "In-house",
    funding: "FY26 H1 — DTS Crime Tech",
    containsPii: false,
    lastUpdatedDaysAgo: 9,
    actions: [A.listings],
    updates: [
      {
        title: "Discovery report draft v1",
        body: [
          "Scoped three forecasting horizons: 24-hour, 7-day, 30-day. The 7-day horizon scored best on Listings Office usefulness ratings.",
          "Next: validate the draft model against last quarter's actuals before committing to a pilot proposal.",
        ],
        daysAgo: 9,
        author: P.alice,
      },
      {
        title: "Listings Office workshop",
        body: [
          "Two listings officers walked through wireframes; both flagged that the 'why is this prediction what it is' explainer is more important than the number itself.",
        ],
        daysAgo: 22,
        author: P.fern,
      },
    ],
    tieringAnswers: { reach: 2, technicalComplexity: 2, ownership: 2 },
  },
  {
    id: "demo-proj-rota-optimisation",
    name: "Court ushering rota optimisation",
    description:
      "Discovery on whether constraint-aware rota generation can reduce " +
      "last-minute usher reallocations across Crown Court centres without " +
      "harming staff preferences.",
    stage: "scan",
    directorate: D_CRIME_OPS,
    businessAreas: [BA.ops, BA.crown],
    primaryCapability: CAP.routing,
    additionalCapabilities: [CAP.forecasting],
    deliveryOwner: P.cara,
    businessLead: P.gita,
    governanceTier: 2,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "yes",
    dpiaInPlace: "in-progress",
    actsInPlace: "missing",
    ethics: "in-progress",
    funding: "FY26 H1 — Crime Operations",
    containsPii: true,
    lastUpdatedDaysAgo: 14,
    updates: [
      {
        title: "Workforce union early-engagement note",
        body: [
          "Met with the staff-side rep; agreed any rota recommendation must remain advisory, never auto-apply, and must show the inputs that drove it.",
        ],
        daysAgo: 14,
        author: P.cara,
      },
    ],
    tieringAnswers: { reach: 2, ownership: 2, publicTrustImplications: 2 },
  },

  // pilot (4)
  {
    id: "demo-proj-jury-bundles",
    name: "Jury bundle triage",
    description:
      "Pilot of Tier 2 assistive summarisation that helps Crown Court juries " +
      "and judges find what matters in thousand-page bundles without altering " +
      "the underlying evidence.",
    stage: "pilot",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.crown],
    primaryCapability: CAP.summarisation,
    additionalCapabilities: [CAP.search, CAP.entity],
    deliveryOwner: P.alice,
    businessLead: P.fern,
    legalLead: P.harry,
    actions: [A.bundles],
    governanceTier: 2,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "yes",
    dpiaInPlace: "complete",
    actsInPlace: "in-progress",
    ethics: "in-progress",
    supplier: "In-house",
    funding: "FY26 — Crime Tech",
    containsPii: true,
    lastUpdatedDaysAgo: 3,
    updates: [
      {
        title: "Pilot expanded to second Crown Court centre",
        body: [
          "Two courts now onboarded; jury bundle triage time down 38% in the latest measurement window.",
          "Judicial feedback: 'I still read the source. The triage tells me where to start.' That framing is now the lead in our internal comms.",
        ],
        daysAgo: 3,
        author: P.alice,
      },
      {
        title: "Tier 2 ATRS draft submitted",
        body: [
          "ATRS draft submitted to the assurance team. Eli Assurance flagged two open items on training-data provenance; tracking on the action plan.",
        ],
        daysAgo: 17,
        author: P.eli,
      },
      {
        title: "First-court go-live",
        body: [
          "First Crown Court centre onboarded last week. Two judges and a clerk trained as super-users.",
        ],
        daysAgo: 41,
        author: P.alice,
      },
    ],
    tieringAnswers: {
      natureOfApplication: 2,
      reach: 2,
      publicTrustImplications: 2,
      legalRegulatoryImplications: 2,
      technicalComplexity: 2,
      typeOfData: 2,
    },
  },
  {
    id: "demo-proj-sentencing-qa",
    name: "Sentencing remarks transcription QA",
    description:
      "Pilot of automated quality checks on sentencing remarks transcripts " +
      "so the official record is correct before it leaves the courtroom.",
    stage: "pilot",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.sentencing, BA.crown],
    primaryCapability: CAP.transcription,
    additionalCapabilities: [CAP.entity, CAP.classification],
    deliveryOwner: P.cara,
    businessLead: P.fern,
    legalLead: P.harry,
    actions: [A.audit],
    governanceTier: 2,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "yes",
    dpiaInPlace: "complete",
    actsInPlace: "complete",
    ethics: "yes",
    supplier: "In-house",
    funding: "FY26 — Crime Tech",
    containsPii: true,
    lastUpdatedDaysAgo: 7,
    updates: [
      {
        title: "QA flagging caught two transcription drift cases",
        body: [
          "The QA layer flagged two cases this week where speaker-attribution drift would have made the official record ambiguous. Both corrected before publication.",
        ],
        daysAgo: 7,
        author: P.cara,
      },
      {
        title: "Pilot extended to a third court",
        body: [
          "Third pilot court signs the data-sharing addendum next Friday. Onboarding session booked.",
        ],
        daysAgo: 21,
        author: P.cara,
      },
    ],
    tieringAnswers: {
      reach: 2,
      legalRegulatoryImplications: 2,
      typeOfData: 2,
      automatedDecisionMaking: 1,
    },
  },
  {
    id: "demo-proj-bwv-indexing",
    name: "Body-worn video evidence indexing",
    description:
      "Pilot of automated indexing of body-worn video so investigators and " +
      "Crown Prosecution Service liaisons can locate the right segment " +
      "without scrubbing through hours of footage.",
    stage: "pilot",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.crown, BA.ops],
    primaryCapability: CAP.classification,
    additionalCapabilities: [CAP.transcription, CAP.entity],
    deliveryOwner: P.alice,
    businessLead: P.gita,
    legalLead: P.harry,
    governanceTier: 1,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "yes",
    dpiaInPlace: "in-progress",
    actsInPlace: "in-progress",
    ethics: "in-progress",
    supplier: "External — pilot vendor",
    funding: "FY26 — Crime Tech (capital)",
    containsPii: true,
    lastUpdatedDaysAgo: 12,
    updates: [
      {
        title: "Tier 1 governance board paper drafted",
        body: [
          "Tier 1 means full governance review. Paper goes to the Crime Delivery Board next sitting; security and DPIA holds remain open.",
          "Risk: vendor model retraining cadence not yet agreed in the contract.",
        ],
        daysAgo: 12,
        author: P.harry,
      },
    ],
    tieringAnswers: {
      natureOfApplication: 3,
      thirdPartyInvolvement: 3,
      publicTrustImplications: 3,
      legalRegulatoryImplications: 3,
      typeOfData: 3,
      dataStorage: 3,
    },
  },
  {
    id: "demo-proj-bail-audit",
    name: "Bail decision-support audit trail",
    description:
      "Pilot of a tamper-evident audit row written every time a bail " +
      "decision-support tool surfaces a recommendation to a court, so " +
      "appeals can review what the tool said and why.",
    stage: "pilot",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.bail, BA.crown, BA.mags],
    primaryCapability: CAP.decision,
    additionalCapabilities: [CAP.classification],
    deliveryOwner: P.harry,
    businessLead: P.gita,
    legalLead: P.dav,
    actions: [A.audit],
    governanceTier: 1,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "yes",
    dpiaInPlace: "complete",
    actsInPlace: "in-progress",
    ethics: "yes",
    supplier: "In-house",
    funding: "FY26 — Crime Tech",
    containsPii: true,
    lastUpdatedDaysAgo: 5,
    updates: [
      {
        title: "Audit-row schema signed off by HMCTS Legal",
        body: [
          "Schema includes the inputs the tool saw, the recommendation surfaced, the human decision recorded, and a stable hash. Implementation starts this sprint.",
        ],
        daysAgo: 5,
        author: P.harry,
      },
      {
        title: "Tier 1 — independent review commissioned",
        body: [
          "Independent reviewer engaged to challenge the decision-support model behaviour before scale-out. Report expected within six weeks.",
        ],
        daysAgo: 28,
        author: P.eli,
      },
    ],
    tieringAnswers: {
      natureOfApplication: 3,
      automatedDecisionMaking: 3,
      legalRegulatoryImplications: 3,
      publicTrustImplications: 3,
      typeOfData: 2,
    },
  },

  // scale (2)
  {
    id: "demo-proj-trial-outcomes",
    name: "Trial outcome ingestion + reporting",
    description:
      "Live national service ingesting Crown Court trial outcome data and " +
      "producing the standard portfolio reports for senior leaders.",
    stage: "scale",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.crown, BA.ops],
    primaryCapability: CAP.entity,
    additionalCapabilities: [CAP.classification, CAP.search],
    deliveryOwner: P.cara,
    businessLead: P.gita,
    legalLead: P.dav,
    governanceTier: 2,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "yes",
    dpiaInPlace: "complete",
    actsInPlace: "complete",
    ethics: "yes",
    supplier: "In-house",
    funding: "FY26 — operating budget",
    userCount: 480,
    containsPii: true,
    lastUpdatedDaysAgo: 11,
    updates: [
      {
        title: "Quarterly reporting pack auto-generated",
        body: [
          "Quarterly pack now generated end-to-end without manual stitching. Saves about two FTE-days per quarter.",
        ],
        daysAgo: 11,
        author: P.cara,
      },
    ],
    tieringAnswers: {
      reach: 2,
      legalRegulatoryImplications: 2,
      typeOfData: 2,
      dataStorage: 2,
      ownership: 2,
    },
  },
  {
    id: "demo-proj-remote-attendance",
    name: "Crown court remote attendance UX",
    description:
      "Live Crown Court remote attendance experience for vulnerable " +
      "witnesses, defendants on bail, and remote interpreters.",
    stage: "scale",
    directorate: D_CRIME_SD,
    businessAreas: [BA.crown, BA.victims],
    primaryCapability: CAP.translation,
    additionalCapabilities: [CAP.transcription],
    deliveryOwner: P.fern,
    businessLead: P.cara,
    legalLead: P.harry,
    governanceTier: 2,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "yes",
    dpiaInPlace: "complete",
    actsInPlace: "complete",
    ethics: "yes",
    supplier: "In-house",
    funding: "FY26 — operating budget",
    userCount: 1240,
    containsPii: true,
    lastUpdatedDaysAgo: 16,
    updates: [
      {
        title: "WCAG 2.2 AA re-test passed",
        body: [
          "External a11y audit re-test passed with no AA failures. Two AAA recommendations parked for the next iteration.",
        ],
        daysAgo: 16,
        author: P.fern,
      },
    ],
    tieringAnswers: {
      reach: 2,
      publicTrustImplications: 2,
      typeOfData: 2,
      legalRegulatoryImplications: 2,
    },
  },

  // sunset (1)
  {
    id: "demo-proj-victim-pipeline-legacy",
    name: "Victim notification pipeline (legacy)",
    description:
      "Original SMS-only victim notification pipeline. Being wound down as " +
      "the modernised multi-channel pipeline scales out region by region.",
    stage: "sunset",
    directorate: D_CRIME_OPS,
    businessAreas: [BA.victims],
    primaryCapability: CAP.routing,
    deliveryOwner: P.cara,
    businessLead: P.gita,
    actions: [A.victims],
    governanceTier: 3,
    riskRegister: "no",
    dpiaInPlace: "complete",
    actsInPlace: "not-required",
    ethics: "yes",
    supplier: "External — legacy supplier",
    funding: "FY26 — wind-down",
    userCount: 90,
    containsPii: true,
    lastUpdatedDaysAgo: 24,
    updates: [
      {
        title: "Two regions migrated; four to go",
        body: [
          "Migrated North East and North West regions. Wind-down on track for end of FY26 H2.",
        ],
        daysAgo: 24,
        author: P.cara,
      },
    ],
    tieringAnswers: { reach: 3, typeOfData: 2 },
  },

  // stalled (1) — closest to "retired" given the available enum.
  {
    id: "demo-proj-probation-routing",
    name: "Probation referral routing",
    description:
      "Probation referral routing pilot paused after dependency change " +
      "upstream. Decision pending on whether to restart against the new " +
      "interface or close.",
    stage: "stalled",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.probation],
    primaryCapability: CAP.routing,
    additionalCapabilities: [CAP.classification],
    deliveryOwner: P.harry,
    businessLead: P.gita,
    governanceTier: 2,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "yes",
    dpiaInPlace: "complete",
    actsInPlace: "missing",
    ethics: "in-progress",
    funding: "FY26 — paused",
    containsPii: true,
    lastUpdatedDaysAgo: 47,
    updates: [
      {
        title: "Paused pending HMPPS interface decision",
        body: [
          "Upstream HMPPS interface change announced; team paused while we wait for the new contract. Reviewing in six weeks.",
        ],
        daysAgo: 47,
        author: P.harry,
      },
    ],
    tieringAnswers: { reach: 2, ownership: 2, automatedDecisionMaking: 2 },
  },
];

const projects: SanityDoc[] = projectInputs.map(buildProject);

function buildProject(p: ProjectInput): SanityDoc {
  return {
    _id: p.id,
    _type: "project",
    name: p.name,
    description: p.description,
    projectStage: p.stage,
    group: ref(directorateToGroup(p.directorate)),
    directorate: ref(p.directorate),
    businessAreas: refsOf(p.businessAreas),
    deliveryOwner: ref(p.deliveryOwner),
    ...(p.businessLead ? { businessLead: ref(p.businessLead) } : {}),
    ...(p.legalLead ? { legalLead: ref(p.legalLead) } : {}),
    capability: ref(p.primaryCapability),
    additionalCapabilities: refsOf(p.additionalCapabilities ?? []),
    actionPlanLinks: refsOf(p.actions ?? []),
    tieringAssessment: { _type: "tieringAssessment", ...p.tieringAnswers },
    governanceTier: p.governanceTier,
    ...(p.governanceBody ? { governanceBody: p.governanceBody } : {}),
    ...(p.riskRegister ? { riskRegister: p.riskRegister } : {}),
    ...(p.dpiaInPlace ? { dpiaInPlace: p.dpiaInPlace } : {}),
    ...(p.actsInPlace ? { actsInPlace: p.actsInPlace } : {}),
    ...(p.ethics ? { mojEthicsFrameworkUse: p.ethics } : {}),
    surveyDetails: {
      _type: "surveyDetails",
      ...(p.supplier ? { supplier: p.supplier } : {}),
      ...(p.userCount != null ? { userCount: p.userCount } : {}),
      ...(p.funding ? { funding: p.funding } : {}),
      ...(p.containsPii != null ? { containsPii: p.containsPii } : {}),
    },
    updates: p.updates.map((u, i) => ({
      _key: `${p.id}-upd-${i}`,
      _type: "projectUpdate",
      title: u.title,
      body: portableText(...u.body),
      authorEmail: emailFor(u.author),
      timestamp: daysAgo(u.daysAgo, 10 + i),
    })),
    lastUpdatedAt: daysAgo(p.lastUpdatedDaysAgo, 9),
  };
}

function directorateToGroup(directorateId: string): string {
  const d = directorates.find((x) => x._id === directorateId);
  if (!d) throw new Error(`Unknown directorate: ${directorateId}`);
  const g = (d.group as { _ref: string })._ref;
  return g;
}

function emailFor(personId: string): string {
  const person = people.find((x) => x._id === personId);
  if (!person) throw new Error(`Unknown person: ${personId}`);
  return person.email as string;
}

// ---------------------------------------------------------------------------
// FAQ (10) — sectioned per the schema enum.
// ---------------------------------------------------------------------------

const faqs: SanityDoc[] = [
  {
    _id: "demo-faq-what-is-portal",
    _type: "faq",
    section: "1. Getting started",
    number: 1,
    question: "What is the portal?",
    answer: portableText(
      "The portal is the DTS Crime view of every initiative across Crown Court, Magistrates' Court, Probation, Victims and Court Operations.",
      "It exists so leaders, delivery teams, and assurance can answer 'what is happening, what stage is it at, and who owns it' without chasing decks.",
    ),
  },
  {
    _id: "demo-faq-add-project",
    _type: "faq",
    section: "1. Getting started",
    number: 2,
    question: "How do I add a project?",
    answer: portableText(
      "Use the Add project flow from the portfolio page. The form walks you through identity, org, people, capability, and the 10-question tiering assessment.",
      "If you don't know an answer yet, save and come back; nothing is required to start.",
    ),
  },
  {
    _id: "demo-faq-find-owner",
    _type: "faq",
    section: "1. Getting started",
    number: 3,
    question: "How do I find the owner of a project?",
    answer: portableText(
      "Open the project dossier. Owner, additional owners, business lead and legal lead are listed under the People panel with email addresses.",
    ),
  },
  {
    _id: "demo-faq-tier-2",
    _type: "faq",
    section: "10. Overall AI strategy and portfolio",
    number: 1,
    question: "What does Tier 2 mean?",
    answer: portableText(
      "Tier 2 is the middle band of the 10-question governance assessment. It typically means notable reach, some legal sensitivity, or moderate technical complexity.",
      "Tier 2 work goes to the DTS Crime Delivery Board for sign-off; it is not a blocker, it is a checkpoint.",
    ),
  },
  {
    _id: "demo-faq-export-excel",
    _type: "faq",
    section: "1. Getting started",
    number: 4,
    question: "How do I export to Excel?",
    answer: portableText(
      "From the portfolio page, use the Export menu and choose Excel. The download is generated in your browser; no project data leaves your session via the export step.",
    ),
  },
  {
    _id: "demo-faq-edit-dossier",
    _type: "faq",
    section: "5. Data security and privacy",
    number: 1,
    question: "Who can edit a dossier?",
    answer: portableText(
      "Admins can edit any project. Editors can edit projects they're listed against. Viewers see everything but cannot change anything. Roles are exact: Viewer, Editor, Admin.",
    ),
  },
  {
    _id: "demo-faq-access",
    _type: "faq",
    section: "5. Data security and privacy",
    number: 2,
    question: "How is access decided?",
    answer: portableText(
      "Access is decided server-side from the email on your authenticated session. Admins are listed in an allowlist; per-project Editors are looked up in Sanity.",
    ),
  },
  {
    _id: "demo-faq-data-storage",
    _type: "faq",
    section: "5. Data security and privacy",
    number: 3,
    question: "Where is my data stored?",
    answer: portableText(
      "Project metadata is stored in Sanity (EU-hosted). The portal itself runs on Render. No casework or witness PII is stored in the portal — only project metadata.",
    ),
  },
  {
    _id: "demo-faq-report-bug",
    _type: "faq",
    section: "1. Getting started",
    number: 5,
    question: "How do I report a bug?",
    answer: portableText(
      "Open a GitHub issue against the dts-crime-portfolio repo, or reach the team on the #dts-crime-portfolio channel. Screenshots help.",
    ),
  },
  {
    _id: "demo-faq-action-plan",
    _type: "faq",
    section: "10. Overall AI strategy and portfolio",
    number: 2,
    question: "What is the Action Plan?",
    answer: portableText(
      "The Action Plan is the published set of strands the directorate is committed to: foundations, embedding into the justice system, and people & partners.",
      "Each strand has actions; each action shows progress and the projects linked to it.",
    ),
  },
];

// ---------------------------------------------------------------------------
// Learning (6)
// ---------------------------------------------------------------------------

const learning: SanityDoc[] = [
  {
    _id: "demo-learning-tiering-101",
    _type: "learningItem",
    type: "guide",
    title: "Tiering 101",
    body: portableText(
      "Tiering is a 10-question structured assessment that puts your project on a 1–3 scale.",
      "Tier 1 is the most sensitive and goes to a full governance review. Tier 3 is light-touch. Tier 2 sits in between and goes to the DTS Crime Delivery Board.",
      "Answer what you can, skip what you don't know. Your overall tier is the highest answer you give.",
    ),
    tags: ["governance", "starter"],
    readingTimeMinutes: 4,
    level: "beginner",
    featured: true,
  },
  {
    _id: "demo-learning-writing-description",
    _type: "learningItem",
    type: "guide",
    title: "Writing a project description",
    body: portableText(
      "Lead with the user outcome. 'Reduce time-to-listing for Magistrates' Court clerks by forecasting daily load' beats 'forecasting service'.",
      "Keep it under 80 words. If it doesn't fit, you have two projects, not one.",
    ),
    tags: ["content design", "starter"],
    readingTimeMinutes: 3,
    level: "beginner",
  },
  {
    _id: "demo-learning-stage-definitions",
    _type: "learningItem",
    type: "guide",
    title: "Stage definitions",
    body: portableText(
      "Idea: a problem worth a discovery. Scan: discovery in flight. Pilot: live in one or two courts under assurance. Scale: live nationally or to all relevant courts. Stalled: paused. Sunset: winding down.",
      "Move stages forward when the evidence supports it; move them back when it doesn't.",
    ),
    tags: ["stages", "starter"],
    readingTimeMinutes: 3,
    level: "beginner",
  },
  {
    _id: "demo-learning-recording-updates",
    _type: "learningItem",
    type: "guide",
    title: "How to record updates",
    body: portableText(
      "An update is a short post explaining what changed. Title is the headline; body is one or two paragraphs.",
      "Updates feed the portfolio, exports, and the digest emails. If you add an update once a fortnight, leadership doesn't need to ask 'what's the latest'.",
    ),
    tags: ["updates", "process"],
    readingTimeMinutes: 2,
    level: "beginner",
  },
  {
    _id: "demo-learning-action-plan-reading",
    _type: "learningItem",
    type: "guide",
    title: "Reading the action plan",
    body: portableText(
      "Each strand on the action plan has a RAG-style status: Completed, Significant progress, Some progress, Gap.",
      "Look at the linked projects, not just the colour. A green strand with no live projects is a flag worth raising.",
    ),
    tags: ["action plan", "leadership"],
    readingTimeMinutes: 3,
    level: "intermediate",
  },
];

// ---------------------------------------------------------------------------
// Prompts (8)
// ---------------------------------------------------------------------------

const prompts: SanityDoc[] = [
  {
    _id: "demo-prompt-director-summary",
    _type: "prompt",
    title: "Summarise this brief in 5 bullets for a Director",
    summary: "Quick read-down for senior leaders ahead of a 30-minute slot.",
    body:
      "You are summarising a delivery brief for a Director who has 5 minutes.\n\n" +
      "Write exactly five bullets, each one line. Cover: the user problem, " +
      "the stage, the biggest open risk, the next decision needed, and the " +
      "ask. No preamble, no closing line.",
    tool: "claude",
    tags: ["#Operations", "#Communications"],
    author: ref(P.alice),
    createdAt: daysAgo(20, 11),
  },
  {
    _id: "demo-prompt-acceptance-tests",
    _type: "prompt",
    title: "Convert acceptance criteria into a test list",
    summary: "Useful when handing a story over to QA.",
    body:
      "Given the following acceptance criteria, produce a numbered list of " +
      "tests. For each test, give: the precondition, the action, and the " +
      "expected observable outcome. Mark anything that needs a fixture or " +
      "test data with a TODO line.",
    tool: "copilot",
    tags: ["#Tech", "#Operations"],
    author: ref(P.cara),
    createdAt: daysAgo(35, 14),
  },
  {
    _id: "demo-prompt-tier2-risk-register",
    _type: "prompt",
    title: "Suggest a risk register for a Tier 2 project",
    summary: "Cold-start a risk register conversation; not a substitute for one.",
    body:
      "I am preparing a Tier 2 risk register for the following project. " +
      "Suggest 8 risks, each with: likelihood (low/med/high), impact (low/" +
      "med/high), mitigation, and owner role. Keep wording neutral; avoid " +
      "predicting any specific person's behaviour.",
    tool: "chatgpt-enterprise",
    tags: ["#Policy", "#Operations"],
    author: ref(P.harry),
    createdAt: daysAgo(12, 9),
  },
  {
    _id: "demo-prompt-show-and-tell",
    _type: "prompt",
    title: "Draft 5-minute show & tell from this update log",
    summary: "Turn a bullet log into a runnable script.",
    body:
      "Read the following project update log. Write a 5-minute show & tell " +
      "script: 30s context, 3 minutes on the user outcome and what changed, " +
      "1 minute on what's next, 30s for one open question for the audience.",
    tool: "claude",
    tags: ["#Communications"],
    author: ref(P.fern),
    createdAt: daysAgo(8, 16),
    competitionMonth: "2026-04",
  },
  {
    _id: "demo-prompt-bundle-checklist",
    _type: "prompt",
    title: "Pre-trial bundle review checklist",
    summary: "Reusable checklist for clerks reviewing a Crown Court bundle.",
    body:
      "Generate a checklist a clerk can run through before a Crown Court " +
      "trial bundle is finalised. Cover: pagination, witness list match, " +
      "exhibit references, redaction completeness, and accessibility " +
      "considerations. Use plain English.",
    tool: "m365-copilot",
    tags: ["#Operations", "#Legal"],
    author: ref(P.cara),
    createdAt: daysAgo(50, 10),
  },
  {
    _id: "demo-prompt-listings-explainer",
    _type: "prompt",
    title: "Explain a listings forecast in plain English",
    summary: "User-research-friendly explainer text.",
    body:
      "Given a numeric listings forecast and the inputs that produced it, " +
      "write a one-paragraph explanation a Listings Officer can read in " +
      "under 30 seconds. Lead with the headline number, then the two " +
      "biggest drivers, then any caveat. Avoid jargon and percentages " +
      "without context.",
    tool: "claude",
    tags: ["#Operations", "#Data Analysis"],
    author: ref(P.alice),
    createdAt: daysAgo(15, 13),
  },
  {
    _id: "demo-prompt-faq-rewrite",
    _type: "prompt",
    title: "Rewrite an FAQ entry in GDS style",
    summary: "Tightening copy for help-page FAQs.",
    body:
      "Rewrite the following FAQ entry in GDS content style: short " +
      "sentences, active voice, no marketing language, second person. " +
      "Cap it at 60 words. Keep meaning identical.",
    tool: "claude",
    tags: ["#Communications", "#Policy"],
    author: ref(P.fern),
    createdAt: daysAgo(40, 9),
  },
  {
    _id: "demo-prompt-meeting-actions",
    _type: "prompt",
    title: "Pull actions out of a Teams transcript",
    summary: "Three-line ask for clean action capture.",
    body:
      "Read the following Teams transcript. Extract every commitment as: " +
      "owner, action, due-by date if mentioned. If a commitment is " +
      "ambiguous, list it under 'needs clarification' rather than guessing.",
    tool: "m365-copilot",
    tags: ["#Operations"],
    author: ref(P.gita),
    createdAt: daysAgo(5, 14),
  },
];

// ---------------------------------------------------------------------------
// Events (6) — mix upcoming and recently-past so the page renders.
// ---------------------------------------------------------------------------

interface EventInput {
  id: string;
  title: string;
  category: string;
  location: string;
  startsDays: number; // negative = past
  durationHours: number;
  body: string[];
}

const eventInputs: EventInput[] = [
  {
    id: "demo-event-show-tell",
    title: "DTS Crime Show & Tell",
    category: "Show & Tell",
    location: "Online (Teams)",
    startsDays: 5,
    durationHours: 1,
    body: [
      "Two delivery teams demo what shipped this fortnight; everyone is welcome — no slides required to attend.",
    ],
  },
  {
    id: "demo-event-action-plan-review",
    title: "Action Plan review",
    category: "Workshop",
    location: "102 Petty France, Room 3.04",
    startsDays: 12,
    durationHours: 2,
    body: [
      "Walking through every strand. Action owners bring a one-pager; we close on the next quarter's priorities.",
    ],
  },
  {
    id: "demo-event-tiering-refresher",
    title: "Tiering refresher",
    category: "Drop-in",
    location: "Online (Teams)",
    startsDays: 19,
    durationHours: 1,
    body: [
      "30 minutes on what's changed in the 10-question tiering assessment, plus a Q&A.",
    ],
  },
  {
    id: "demo-event-welcome-new-starters",
    title: "Welcome session for new starters",
    category: "Workshop",
    location: "102 Petty France, Room 2.11",
    startsDays: -3,
    durationHours: 1,
    body: [
      "Onboarded six new starters across DTS Crime: a tour of the portal, the action plan, and where to find help.",
    ],
  },
  {
    id: "demo-event-q3-portfolio-review",
    title: "Q3 portfolio review",
    category: "Review",
    location: "102 Petty France, Boardroom",
    startsDays: -10,
    durationHours: 2,
    body: [
      "Quarterly review across every Tier 1 and Tier 2 project. Outputs feed the next Action Plan iteration.",
    ],
  },
];

const events: SanityDoc[] = eventInputs.map((e) => ({
  _id: e.id,
  _type: "event",
  title: e.title,
  category: e.category,
  location: e.location,
  startsAt: e.startsDays >= 0 ? daysAhead(e.startsDays, 14) : daysAgo(-e.startsDays, 14),
  endsAt:
    e.startsDays >= 0
      ? daysAhead(e.startsDays, 14 + e.durationHours)
      : daysAgo(-e.startsDays, 14 + e.durationHours),
  body: portableText(...e.body),
}));

// ---------------------------------------------------------------------------
// ChangeLog (5)
// ---------------------------------------------------------------------------

const changeLog: SanityDoc[] = [
  {
    _id: "demo-changelog-1",
    _type: "changeLog",
    documentId: "demo-proj-jury-bundles",
    documentType: "project",
    field: "projectStage",
    before: JSON.stringify("scan"),
    after: JSON.stringify("pilot"),
    userEmail: emailFor(P.alice),
    timestamp: daysAgo(41, 9),
  },
  {
    _id: "demo-changelog-2",
    _type: "changeLog",
    documentId: "demo-proj-jury-bundles",
    documentType: "project",
    field: "updates",
    before: JSON.stringify(null),
    after: JSON.stringify("(new update added)"),
    userEmail: emailFor(P.alice),
    timestamp: daysAgo(3, 9),
  },
  {
    _id: "demo-changelog-3",
    _type: "changeLog",
    documentId: "demo-proj-bail-audit",
    documentType: "project",
    field: "tieringAssessment.automatedDecisionMaking",
    before: JSON.stringify(2),
    after: JSON.stringify(3),
    userEmail: emailFor(P.harry),
    timestamp: daysAgo(28, 11),
  },
  {
    _id: "demo-changelog-4",
    _type: "changeLog",
    documentId: "demo-proj-listings-forecasting",
    documentType: "project",
    field: "description",
    before: JSON.stringify("(initial submission)"),
    after: JSON.stringify("(edited)"),
    userEmail: emailFor(P.alice),
    timestamp: daysAgo(22, 14),
  },
  {
    _id: "demo-changelog-5",
    _type: "changeLog",
    documentId: "demo-proj-probation-routing",
    documentType: "project",
    field: "projectStage",
    before: JSON.stringify("pilot"),
    after: JSON.stringify("stalled"),
    userEmail: emailFor(P.harry),
    timestamp: daysAgo(47, 10),
  },
];

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

const ALL_DOCS: SanityDoc[] = [
  ...groups,
  ...directorates,
  ...businessAreas,
  ...capabilities,
  ...people,
  ...actions,
  ...projects,
  ...faqs,
  ...learning,
  ...prompts,
  ...events,
  ...changeLog,
];

async function main(): Promise<void> {
  if (DATASET === "production") {
    console.error(
      "Refusing to seed against the production dataset. " +
        "Set NEXT_PUBLIC_SANITY_DATASET=preview (or another non-production dataset).",
    );
    process.exit(1);
  }

  const counts = group(ALL_DOCS);
  console.log(
    `Seeding ${ALL_DOCS.length} documents into projectId=${PROJECT_ID} dataset=${DATASET}` +
      (DRY_RUN ? " (DRY RUN — no writes)" : ""),
  );

  if (DRY_RUN) {
    for (const [type, count] of counts) {
      console.log(`  would create ${count} documents of type ${type}`);
    }
    return;
  }

  if (!TOKEN) {
    console.error(
      "SANITY_API_TOKEN must be set (Editor scope on the target dataset). " +
        "See docs/seeding-demo-data.md.",
    );
    process.exit(1);
  }

  const client: SanityClient = createClient({
    projectId: PROJECT_ID,
    dataset: DATASET,
    apiVersion: API_VERSION,
    token: TOKEN,
    useCdn: false,
  });

  // Reference data must land before the documents that reference it. Within
  // each phase we batch into one transaction for atomicity and speed.
  const phases: Array<{ label: string; docs: SanityDoc[] }> = [
    { label: "reference data", docs: [...groups, ...directorates, ...businessAreas, ...capabilities, ...people, ...actions] },
    { label: "projects", docs: projects },
    { label: "content", docs: [...faqs, ...learning, ...prompts, ...events] },
    { label: "audit", docs: changeLog },
  ];

  for (const phase of phases) {
    if (phase.docs.length === 0) continue;
    let tx = client.transaction();
    for (const doc of phase.docs) {
      tx = tx.createOrReplace(doc);
    }
    await tx.commit();
    const phaseCounts = group(phase.docs);
    for (const [type, count] of phaseCounts) {
      console.log(`  created ${count} documents of type ${type} (${phase.label})`);
    }
  }

  console.log(`Done. Total: ${ALL_DOCS.length} documents.`);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
