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
//
// 2026 reframing: the four strands map directly onto the public priorities
// shaping DTS Crime delivery — reducing the Crown Court outstanding caseload,
// modernising listing and judicial-capacity scheduling, improving pre-trial
// readiness, and strengthening digital case-file quality. Each strand uses
// the strand-enum ("1. Foundations" / "2. Embed" / "3. People & Partners")
// that exists in the schema; the *name* is what the portfolio shows to
// readers as the strand-level outcome.
const A = {
  backlog: "demo-action-backlog",
  listings: "demo-action-listings",
  pretrial: "demo-action-pretrial",
  caseFile: "demo-action-case-file",
} as const;

const actions: SanityDoc[] = [
  {
    _id: A.backlog,
    _type: "action",
    actionNo: "1.1",
    name: "Reduce the Crown Court outstanding caseload",
    strand: "1. Foundations",
    priority: "High",
    description:
      "Strand-level outcome owned at SRO level: every project on the " +
      "portfolio that materially shortens charge-to-disposal time, reduces " +
      "cracked or ineffective trials, or unlocks listing capacity is " +
      "tracked here. Aligned with the public Crown Court backlog reduction " +
      "priority and the Independent Review of the Criminal Courts terms " +
      "of reference, with copy refreshed as recommendations land.",
    progressStatus: "Some progress",
    summaryOfProgress: portableText(
      "Year-to-date contribution: bundle triage scaled across two Crown Court centres; cracked-trial root-cause classifier piloted on twelve weeks of historical data; listings forecasting pilot now feeding three Listings Offices.",
      "Next: integrate the cracked-trial root-cause signal into the listings forecasting model so Listings Offices can pre-empt the top three causes of listings churn before the day of trial.",
      "Caveat: the Independent Review of the Criminal Courts (Sir Brian Leveson) recommendations may evolve; this strand is tracked against the published terms of reference and updated as the recommendations land.",
    ),
  },
  {
    _id: A.listings,
    _type: "action",
    actionNo: "1.2",
    name: "Modernise listing and judicial capacity scheduling",
    strand: "1. Foundations",
    priority: "High",
    description:
      "Improve listing accuracy, sitting-day deployment, and courtroom " +
      "utilisation. Projects on this strand reduce empty courtroom hours, " +
      "rebalance load across centres, and surface listing-capacity risk " +
      "before it crystallises as a cracked or ineffective trial.",
    progressStatus: "Significant progress",
    summaryOfProgress: portableText(
      "Listings forecasting pilot live in three Listings Offices; weekly listing-accuracy delta narrowed from ±18% to ±9% against actuals.",
      "Next: extend the forecast horizon to 30 days and integrate the courtroom-utilisation signal with the cracked-trial root-cause classifier.",
    ),
  },
  {
    _id: A.pretrial,
    _type: "action",
    actionNo: "2.1",
    name: "Improve pre-trial readiness",
    strand: "2. Embed",
    priority: "High",
    description:
      "Bundles, witness scheduling, interpreter availability, defence " +
      "engagement, and disclosure quality. Projects on this strand reduce " +
      "the volume of trials that crack on the day because a piece of the " +
      "pre-trial puzzle was missing.",
    progressStatus: "Some progress",
    summaryOfProgress: portableText(
      "Bundle triage scaled to a second Crown Court centre; judicial reading time down 38% in the latest measurement window.",
      "Witness availability anomaly detection in pilot — flagging an average of nine scheduling conflicts per week before they become ineffective trials.",
      "Risk: interpreter-scheduling discovery still in scan; cracked trials caused by interpreter unavailability remain in the top five reasons logged.",
    ),
  },
  {
    _id: A.caseFile,
    _type: "action",
    actionNo: "3.1",
    name: "Strengthen digital case-file quality",
    strand: "3. People & Partners",
    priority: "Medium",
    description:
      "Common Platform data hygiene, search, and analytics. A clean " +
      "case file is the foundation every other strand stands on — it is " +
      "what makes triage usable, listings forecastable, and cracked-trial " +
      "root-cause analysis possible at all.",
    progressStatus: "Some progress",
    summaryOfProgress: portableText(
      "Common Platform data quality scoring rolled out across two regions; first scorecard surfaced 14 high-impact field-completeness gaps now being remediated by the originating teams.",
      "Next: feed the data-quality score into the cracked-trial root-cause classifier so the model can attribute uncertainty to data gaps versus genuine drivers.",
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

// Reframing note (2026): every project below maps a *capability* (Summarisation,
// Forecasting, Decision support, ...) onto a *backlog/Leveson outcome* —
// reduce cracked trials, optimise listing capacity, improve pre-trial
// readiness, etc. The description on each project names the outcome
// contribution explicitly so the portfolio can be filtered or summarised
// by strand without a separate tag system.
//
// Every project links to at least one of the four action-plan strands
// (`A.backlog` / `A.listings` / `A.pretrial` / `A.caseFile`). Tiers are
// 1, 2 or 3 — the schema's tier enum (lib/enums/tier.ts) does not include
// a Tier 4, so the Tier-4 entries in the original brief are seeded as
// Tier 3 with light governance.
const projectInputs: ProjectInput[] = [
  // scale (2) — including the Tier 2 flagship for backlog reduction.
  {
    id: "demo-proj-bundle-triage",
    name: "Crown Court bundle triage assistant",
    description:
      "Live assistive summarisation that helps Crown Court judges and " +
      "juries find what matters in thousand-page bundles without altering " +
      "the underlying evidence. Outcome contribution: cuts judicial " +
      "reading time pre-hearing so trials reach readiness sooner — a " +
      "direct lever on the Crown Court outstanding caseload.",
    stage: "scale",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.crown],
    primaryCapability: CAP.summarisation,
    additionalCapabilities: [CAP.search, CAP.entity],
    deliveryOwner: P.alice,
    businessLead: P.fern,
    legalLead: P.harry,
    actions: [A.backlog, A.pretrial],
    governanceTier: 2,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "yes",
    dpiaInPlace: "complete",
    actsInPlace: "complete",
    ethics: "yes",
    supplier: "In-house",
    funding: "FY26 — Crime Tech",
    userCount: 320,
    containsPii: true,
    lastUpdatedDaysAgo: 3,
    updates: [
      {
        title: "Scaled to a second Crown Court centre",
        body: [
          "Second Crown Court centre live this week; judicial reading time down 38% in the latest measurement window across both centres.",
          "Backlog contribution: trials that previously slipped because the bundle wasn't read in time are tracked separately — three avoided in the first six weeks at centre two. Aligned with the pre-trial readiness strand.",
        ],
        daysAgo: 3,
        author: P.alice,
      },
      {
        title: "Tier 2 ATRS sign-off",
        body: [
          "ATRS sign-off completed. Two open items on training-data provenance closed; logged on the strand 1 progress note.",
        ],
        daysAgo: 24,
        author: P.eli,
      },
      {
        title: "Pilot graduates to scale",
        body: [
          "Pilot evidence pack accepted by the Delivery Board: judicial reading time and trial-readiness signals both moved in the right direction across the pilot quarter.",
        ],
        daysAgo: 49,
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
    id: "demo-proj-case-file-quality",
    name: "Common Platform data quality scoring",
    description:
      "Live scoring service that grades Common Platform case-file " +
      "completeness, surfaces high-impact field gaps, and routes them " +
      "to the originating team for remediation. Outcome contribution: " +
      "improves search and analytics across the case file, which every " +
      "downstream backlog-reduction model depends on.",
    stage: "scale",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.crown, BA.mags, BA.ops],
    primaryCapability: CAP.search,
    additionalCapabilities: [CAP.classification, CAP.entity],
    deliveryOwner: P.cara,
    businessLead: P.gita,
    legalLead: P.dav,
    actions: [A.caseFile, A.backlog],
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
        title: "Region-2 scorecard live",
        body: [
          "Second region's scorecard live. Surfaced 14 high-impact field-completeness gaps that map directly onto cracked-trial root causes — handed back to the originating teams with a remediation deadline.",
        ],
        daysAgo: 11,
        author: P.cara,
      },
      {
        title: "Search relevance uplift",
        body: [
          "Case-file search relevance lift of 22% measured against the previous baseline; downstream impact on the cracked-trial root-cause classifier is now traceable.",
        ],
        daysAgo: 38,
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

  // pilot (5)
  {
    id: "demo-proj-listings-forecasting",
    name: "Listings forecasting and sitting-day optimiser",
    description:
      "Pilot of a listings forecasting model that helps Listings Offices " +
      "rebalance courtrooms and sitting days against likely demand and " +
      "judicial availability. Outcome contribution: improves listing " +
      "accuracy so fewer trials crack on the day for capacity reasons " +
      "— a Tier 1 lever on the Crown Court outstanding caseload.",
    stage: "pilot",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.listings, BA.crown, BA.mags],
    primaryCapability: CAP.forecasting,
    additionalCapabilities: [CAP.decision],
    deliveryOwner: P.alice,
    businessLead: P.cara,
    legalLead: P.harry,
    actions: [A.listings, A.backlog],
    governanceTier: 1,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "yes",
    dpiaInPlace: "in-progress",
    actsInPlace: "in-progress",
    ethics: "in-progress",
    supplier: "In-house",
    funding: "FY26 H1 — DTS Crime Tech",
    userCount: 64,
    containsPii: false,
    lastUpdatedDaysAgo: 6,
    updates: [
      {
        title: "Three Listings Offices feeding the model",
        body: [
          "Three Listings Offices now contributing daily actuals; weekly listing-accuracy delta narrowed from ±18% to ±9%.",
          "Tracking against the Independent Review of the Criminal Courts terms of reference — listing-capacity recommendations as they land will inform the model's outputs surface.",
        ],
        daysAgo: 6,
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
    tieringAnswers: {
      natureOfApplication: 3,
      reach: 3,
      publicTrustImplications: 2,
      technicalComplexity: 2,
      ownership: 2,
    },
  },
  {
    id: "demo-proj-mode-of-trial",
    name: "Mode-of-trial decision support (either-way)",
    description:
      "Pilot of a Tier 2 decision-support tool that surfaces structured " +
      "considerations for either-way mode-of-trial allocation, alongside " +
      "the existing judicial process. Outcome contribution: supports " +
      "faster, more consistent mode allocation so cases settle in the " +
      "right venue first time and venue churn is reduced.",
    stage: "pilot",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.crown, BA.mags],
    primaryCapability: CAP.decision,
    additionalCapabilities: [CAP.classification],
    deliveryOwner: P.harry,
    businessLead: P.gita,
    legalLead: P.dav,
    actions: [A.backlog, A.listings],
    governanceTier: 2,
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
        title: "Independent review report received",
        body: [
          "Independent reviewer's report received. Two recommendations on how the tool surfaces uncertainty are being folded in before any expansion.",
          "Caveat: the tool is advisory and the judicial decision-maker remains the decision-maker; copy on every screen reflects that.",
        ],
        daysAgo: 5,
        author: P.eli,
      },
      {
        title: "Pilot scope agreed with Magistrates' liaison",
        body: [
          "Pilot scope agreed: 200 either-way cases across two Magistrates' centres, with the existing process unchanged. The tool sits beside the decision, not inside it.",
        ],
        daysAgo: 31,
        author: P.harry,
      },
    ],
    tieringAnswers: {
      natureOfApplication: 2,
      automatedDecisionMaking: 2,
      legalRegulatoryImplications: 2,
      publicTrustImplications: 2,
      typeOfData: 2,
    },
  },
  {
    id: "demo-proj-cracked-trial-classifier",
    name: "Cracked-trial root-cause classifier",
    description:
      "Pilot of a document classifier that reads listings and case " +
      "history records to attribute cracked and ineffective trials to " +
      "their primary root cause. Outcome contribution: gives the " +
      "Listings and Crown Court ops teams a reliable signal on the top " +
      "drivers of cracked trials so intervention can be targeted.",
    stage: "pilot",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.crown, BA.listings, BA.ops],
    primaryCapability: CAP.classification,
    additionalCapabilities: [CAP.entity, CAP.search],
    deliveryOwner: P.cara,
    businessLead: P.gita,
    actions: [A.backlog, A.pretrial],
    governanceTier: 3,
    riskRegister: "yes",
    dpiaInPlace: "complete",
    actsInPlace: "in-progress",
    ethics: "yes",
    supplier: "In-house",
    funding: "FY26 — Crime Tech",
    containsPii: false,
    lastUpdatedDaysAgo: 9,
    updates: [
      {
        title: "Twelve weeks of historical data classified",
        body: [
          "Twelve weeks of historical cracked-trial data classified. Top three causes consistently: late witness availability change, defence engagement gap, and interpreter unavailability.",
          "These three feed straight into the pre-trial readiness strand's prioritisation discussion.",
        ],
        daysAgo: 9,
        author: P.cara,
      },
      {
        title: "Pilot kicked off",
        body: [
          "Three Listings Offices contributing labelled examples to the training set. Aiming for a calibrated accuracy figure before any move to scale.",
        ],
        daysAgo: 33,
        author: P.cara,
      },
    ],
    tieringAnswers: { reach: 3, technicalComplexity: 2 },
  },
  {
    id: "demo-proj-witness-anomaly",
    name: "Witness availability anomaly detection",
    description:
      "Pilot of an anomaly-detection layer over witness scheduling " +
      "feeds that flags emerging conflicts (double-booking, travel " +
      "infeasibility, late availability changes) before they cause an " +
      "ineffective trial. Outcome contribution: reduces ineffective " +
      "trials by giving Listings Offices a working-day's notice on the " +
      "issues that would otherwise surface in the morning.",
    stage: "pilot",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.victims, BA.listings, BA.crown],
    primaryCapability: CAP.anomaly,
    additionalCapabilities: [CAP.forecasting],
    deliveryOwner: P.fern,
    businessLead: P.cara,
    legalLead: P.harry,
    actions: [A.pretrial, A.backlog],
    governanceTier: 3,
    riskRegister: "yes",
    dpiaInPlace: "complete",
    actsInPlace: "in-progress",
    ethics: "in-progress",
    supplier: "In-house",
    funding: "FY26 — Crime Tech",
    containsPii: true,
    lastUpdatedDaysAgo: 4,
    updates: [
      {
        title: "Nine conflicts flagged, eight resolved",
        body: [
          "Nine scheduling conflicts flagged this week; eight resolved before the day of trial. The ninth was logged for the cracked-trial root-cause classifier to learn from.",
        ],
        daysAgo: 4,
        author: P.fern,
      },
    ],
    tieringAnswers: { reach: 3, typeOfData: 2, publicTrustImplications: 2 },
  },
  {
    id: "demo-proj-disclosure-routing",
    name: "Disclosure routing engine",
    description:
      "Pilot of a routing engine that classifies disclosure items and " +
      "directs them to the correct downstream queue (defence, third " +
      "party, redaction). Outcome contribution: reduces the share of " +
      "cracked trials caused by disclosure handling, in support of the " +
      "pre-trial readiness strand.",
    stage: "pilot",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.crown, BA.ops],
    primaryCapability: CAP.routing,
    additionalCapabilities: [CAP.classification],
    deliveryOwner: P.alice,
    businessLead: P.gita,
    legalLead: P.harry,
    actions: [A.pretrial, A.caseFile],
    governanceTier: 2,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "yes",
    dpiaInPlace: "complete",
    actsInPlace: "in-progress",
    ethics: "yes",
    supplier: "In-house",
    funding: "FY26 — Crime Tech",
    containsPii: true,
    lastUpdatedDaysAgo: 14,
    updates: [
      {
        title: "Routing accuracy calibrated",
        body: [
          "Routing classifier calibrated against four weeks of labelled disclosure traffic; precision on the high-sensitivity bucket sits at 96% with a manual fallback for anything below the threshold.",
        ],
        daysAgo: 14,
        author: P.alice,
      },
    ],
    tieringAnswers: {
      reach: 2,
      legalRegulatoryImplications: 2,
      typeOfData: 2,
      ownership: 2,
    },
  },

  // scan / discovery (1)
  {
    id: "demo-proj-interpreter-scheduling",
    name: "Court interpreter scheduling assistant",
    description:
      "Discovery into forecasting interpreter demand and matching " +
      "scheduled interpreters against trial-week constraints. Outcome " +
      "contribution: reduces cracked trials caused by interpreter " +
      "unavailability — currently in the top three causes the cracked-" +
      "trial classifier surfaces.",
    stage: "scan",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.crown, BA.mags, BA.ops],
    primaryCapability: CAP.forecasting,
    additionalCapabilities: [CAP.routing],
    deliveryOwner: P.cara,
    businessLead: P.gita,
    actions: [A.pretrial],
    governanceTier: 3,
    riskRegister: "yes",
    dpiaInPlace: "in-progress",
    actsInPlace: "missing",
    ethics: "in-progress",
    funding: "FY26 H1 — DTS Crime Tech",
    containsPii: true,
    lastUpdatedDaysAgo: 12,
    updates: [
      {
        title: "Interpreter supplier workshop",
        body: [
          "Workshop with the interpreter supplier liaison: agreed any forecast must be advisory and must not commit interpreters across the supplier's contracted boundaries. Discovery report drafting now.",
        ],
        daysAgo: 12,
        author: P.cara,
      },
    ],
    tieringAnswers: { reach: 3, ownership: 2, typeOfData: 2 },
  },

  // idea (2)
  {
    id: "demo-proj-transcription-qa",
    name: "Crown Court audio transcription QA",
    description:
      "Idea-stage exploration of automated quality checks on Crown " +
      "Court audio transcripts to flag speaker-attribution drift and " +
      "redaction gaps before publication. Outcome contribution: reduces " +
      "re-listing for transcript issues, freeing courtroom hours.",
    stage: "idea",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.crown, BA.sentencing],
    primaryCapability: CAP.transcription,
    additionalCapabilities: [CAP.classification, CAP.entity],
    deliveryOwner: P.cara,
    businessLead: P.fern,
    actions: [A.caseFile],
    governanceTier: 3,
    riskRegister: "unknown",
    dpiaInPlace: "missing",
    actsInPlace: "missing",
    ethics: "unknown",
    funding: "Discovery — internal",
    containsPii: true,
    lastUpdatedDaysAgo: 21,
    updates: [
      {
        title: "Concept note circulated",
        body: [
          "Concept note shared with Crown Court ops and the sentencing remarks transcription team. Open question: which transcript surfaces would benefit most before sentencing remarks themselves?",
        ],
        daysAgo: 21,
        author: P.cara,
      },
    ],
    tieringAnswers: { typeOfData: 2, legalRegulatoryImplications: 2 },
  },
  {
    id: "demo-proj-mags-venue-allocation",
    name:
      "Magistrates' Court venue allocation (Leveson recommendation tracking)",
    description:
      "Idea-stage placeholder to track delivery against the venue-" +
      "allocation recommendations of the Independent Review of the " +
      "Criminal Courts as they land. Outcome contribution: ensures DTS " +
      "Crime is ready to support whichever venue-allocation reforms are " +
      "adopted, in service of the Crown Court outstanding caseload " +
      "priority.",
    stage: "idea",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.crown, BA.mags, BA.listings],
    primaryCapability: CAP.decision,
    deliveryOwner: P.dav,
    businessLead: P.gita,
    legalLead: P.dav,
    actions: [A.backlog, A.listings],
    governanceTier: 1,
    governanceBody: "DTS Crime Delivery Board",
    riskRegister: "unknown",
    dpiaInPlace: "missing",
    actsInPlace: "missing",
    ethics: "unknown",
    funding: "FY26 — placeholder pending recommendation",
    containsPii: false,
    lastUpdatedDaysAgo: 8,
    updates: [
      {
        title: "Tracking note opened",
        body: [
          "Idea-stage entry opened so the portfolio reflects readiness to support whichever venue-allocation recommendations the Independent Review of the Criminal Courts produces. No design work yet — copy will be refreshed when recommendations land.",
        ],
        daysAgo: 8,
        author: P.dav,
      },
    ],
    tieringAnswers: {
      natureOfApplication: 3,
      publicTrustImplications: 3,
      legalRegulatoryImplications: 3,
    },
  },

  // stalled (1)
  {
    id: "demo-proj-plea-before-venue",
    name: "Plea-before-venue confidence indicator",
    description:
      "Stalled discovery into a confidence indicator for plea-before-" +
      "venue decisions. Paused pending a policy decision and held on " +
      "the portfolio for visibility. Outcome contribution (when " +
      "restarted): would inform venue churn reduction.",
    stage: "stalled",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.mags, BA.crown],
    primaryCapability: CAP.forecasting,
    additionalCapabilities: [CAP.classification],
    deliveryOwner: P.harry,
    businessLead: P.gita,
    actions: [A.backlog],
    governanceTier: 3,
    riskRegister: "yes",
    dpiaInPlace: "in-progress",
    actsInPlace: "missing",
    ethics: "in-progress",
    funding: "FY26 — paused",
    containsPii: true,
    lastUpdatedDaysAgo: 47,
    updates: [
      {
        title: "Paused pending policy decision",
        body: [
          "Discovery paused while the policy direction on plea-before-venue settles. Project kept on the portfolio so it doesn't quietly disappear from sight; review in six weeks.",
        ],
        daysAgo: 47,
        author: P.harry,
      },
    ],
    tieringAnswers: {
      reach: 2,
      ownership: 2,
      automatedDecisionMaking: 2,
      legalRegulatoryImplications: 3,
    },
  },

  // sunset (1)
  {
    id: "demo-proj-bwv-indexing-legacy",
    name: "Body-worn video evidence indexing (legacy)",
    description:
      "Sunset: legacy external body-worn video indexing service, " +
      "wound down because the in-house tool replaced it. Outcome " +
      "contribution (historic): freed investigator time during the " +
      "transition; superseded by the in-house indexer.",
    stage: "sunset",
    directorate: D_CRIME_TECH,
    businessAreas: [BA.crown, BA.ops],
    primaryCapability: CAP.ocr,
    additionalCapabilities: [CAP.entity],
    deliveryOwner: P.alice,
    businessLead: P.gita,
    actions: [A.caseFile],
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
        title: "Final region migrated to the in-house indexer",
        body: [
          "Final region migrated. Wind-down of the legacy contract complete; the in-house indexer now handles 100% of body-worn video indexing.",
        ],
        daysAgo: 24,
        author: P.alice,
      },
    ],
    tieringAnswers: { reach: 3, typeOfData: 2 },
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
    _id: "demo-learning-action-plan-reading",
    _type: "learningItem",
    type: "guide",
    title: "Reading the action plan strands",
    body: portableText(
      "The 2026 action plan has four strands. Strand 1 — 'Reduce the Crown Court outstanding caseload' — is the SRO-owned outcome strand. Strands 2, 3 and 4 — listing and judicial capacity, pre-trial readiness, and digital case-file quality — are the levers that feed it.",
      "Each strand has a progress status (Significant progress, Some progress, Gap, Completed) and a list of linked projects. Look at the linked projects, not just the colour. A strand reading green with no live projects is a flag worth raising.",
      "Many projects link more than one strand. That's expected — the portfolio rolls contributions up the way the strands compose, not as a single tag.",
    ),
    tags: ["action plan", "leadership", "backlog"],
    readingTimeMinutes: 4,
    level: "intermediate",
    featured: true,
  },
  {
    _id: "demo-learning-backlog-primer",
    _type: "learningItem",
    type: "guide",
    title: "Crown Court backlog primer for AI delivery teams",
    body: portableText(
      "The Crown Court outstanding caseload reached record levels post-pandemic. Drivers commonly cited in public information include the pandemic backlog itself, growing case complexity, witness availability, listing capacity, judicial capacity, and the volume of cracked or ineffective trials.",
      "The Independent Review of the Criminal Courts under Sir Brian Leveson was set up to recommend structural reforms in response. Themes likely to shape DTS Crime delivery, based on the published terms of reference, include venue allocation, mode-of-trial reform, listing efficiency, magistrates' court empowerment, disclosure and case progression, and cracked / ineffective trial reduction.",
      "What this means for delivery teams: pick the lever your project actually moves, name it in the project description, and link the strand it feeds. Recommendations may evolve — copy on this portfolio is refreshed as they land.",
      "Sources to check directly rather than rely on second-hand summary: HMCTS published statistics on outstanding cases, the published terms of reference for the Independent Review of the Criminal Courts, and Ministry of Justice quarterly criminal court statistics.",
    ),
    tags: ["backlog", "Leveson", "primer"],
    readingTimeMinutes: 6,
    level: "beginner",
  },
  {
    _id: "demo-learning-writing-description",
    _type: "learningItem",
    type: "guide",
    title: "Writing a project description that names the outcome",
    body: portableText(
      "Lead with the user outcome and the strand it feeds. 'Cuts judicial reading time pre-hearing so trials reach readiness sooner — a direct lever on the Crown Court outstanding caseload' beats 'AI summarisation tool'.",
      "Pattern: capability + user + outcome + strand. The capability is your AI lever (Summarisation, Forecasting, ...). The user is the role inside HMCTS that benefits. The outcome is the measurable change. The strand is which action plan strand picks up the contribution.",
      "Keep it under 80 words. If it doesn't fit, you have two projects, not one.",
    ),
    tags: ["content design", "starter", "outcomes"],
    readingTimeMinutes: 4,
    level: "beginner",
  },
  {
    _id: "demo-learning-stage-definitions",
    _type: "learningItem",
    type: "guide",
    title: "Stage definitions for the AI portfolio",
    body: portableText(
      "Idea: a problem worth a discovery. Scan: discovery in flight. Pilot: live in one or two courts under assurance. Scale: live nationally or to all relevant courts. Stalled: paused. Sunset: winding down.",
      "Move stages forward when the evidence supports it; move them back when it doesn't.",
    ),
    tags: ["stages", "starter"],
    readingTimeMinutes: 3,
    level: "beginner",
  },
];

// ---------------------------------------------------------------------------
// Prompts (8) with comments, replies, and per-comment upvotes
// ---------------------------------------------------------------------------
//
// The card and modal redesign (`expand-prompts-comments-and-replies`)
// turns the comments thread into a primary surface, so the demo needs a
// believable conversation around each prompt — questions, kudos, edge-
// case challenges, and an occasional reply. The lists below are picked
// to keep the modal feeling lived-in without paragraphs of lorem.
//
// Privacy: the listing surface never exposes commenter email — author
// display name and a stable `authorSeed` (person._id, hashed in the
// component) are the only things the client sees. Hosting the seed
// fictional emails here is fine for the same reason the rest of this
// file does — they are obviously test data and the script refuses to
// run against the production dataset.

interface CommenterFixture {
  email: string;
  name: string;
}

const COMMENTERS: Record<string, CommenterFixture> = {
  emma: { email: "emma.hunter2@hmcts.net", name: "Emma Hunter2" },
  yvonne: { email: "yvonne.lynn2@justice.gov.uk", name: "Yvonne Lynn2" },
  natalie: { email: "natalie.stableford1@hmcts.net", name: "Natalie Stableford1" },
  frank: { email: "frank.adler@justice.gov.uk", name: "Frank Adler" },
  priya: { email: "priya.shah3@hmcts.net", name: "Priya Shah3" },
  rob: { email: "rob.kelner@justice.gov.uk", name: "Rob Kelner" },
  jas: { email: "jas.mitra@hmcts.net", name: "Jas Mitra" },
  chuks: { email: "chuks.okafor@justice.gov.uk", name: "Chuks Okafor" },
  lina: { email: "lina.beretta@hmcts.net", name: "Lina Beretta" },
};

// Stable Person documents for each commenter so the listing GROQ can
// resolve `authorName` and `authorSeed` cleanly. Pre-existing demo
// people (Alice, Cara, ...) are reused as commenters too — see
// `commenterEmailFor` below.
const commenterPeople: SanityDoc[] = Object.entries(COMMENTERS).map(
  ([key, value]) => ({
    _id: `demo-person-commenter-${key}`,
    _type: "person",
    name: value.name,
    email: value.email,
  }),
);

interface CommentSeed {
  /** Stable label so replies can refer to a parent. */
  label: string;
  by: keyof typeof COMMENTERS | keyof typeof P;
  daysAgo: number;
  hoursAgo?: number;
  body: string;
  upvotes: number;
  /** When set, marks this comment as a reply to the comment with this label. */
  parent?: string;
}

function commenterEmailFor(by: string): string {
  if (by in COMMENTERS) return COMMENTERS[by as keyof typeof COMMENTERS]!.email;
  // Fall through to the existing P map (Alice, Cara, ...) — those get
  // their email from the people array.
  if (by in P) return emailFor((P as Record<string, string>)[by]!);
  throw new Error(`Unknown commenter: ${by}`);
}

function commentTimestamp(daysAgoCount: number, hoursAgoCount = 0): string {
  if (daysAgoCount === 0 && hoursAgoCount > 0) {
    const d = new Date();
    d.setUTCHours(d.getUTCHours() - hoursAgoCount, 0, 0, 0);
    return d.toISOString();
  }
  return daysAgo(daysAgoCount, 9);
}

interface BuiltCommentEntry {
  _key: string;
  _type: "promptComment";
  userEmail: string;
  body: string;
  createdAt: string;
  parentKey?: string;
  upvotes: Array<{
    _key: string;
    _type: "promptCommentUpvote";
    userEmail: string;
    createdAt: string;
  }>;
}

/**
 * Materialise a list of `CommentSeed` definitions into the inline
 * comments array on a prompt. Replies are resolved by label so the
 * fixtures stay readable; the resulting `parentKey` is the appropriate
 * `_key` value on the parent.
 *
 * Per-comment upvote rosters are deterministic — we walk through a
 * rotating slice of the commenter pool plus the existing demo people
 * so the same comment on a re-run has the same upvote roster (the
 * script is idempotent overall and we want this to stay true).
 */
function buildComments(
  promptId: string,
  seeds: CommentSeed[],
): BuiltCommentEntry[] {
  const upvoterPool: string[] = [
    ...Object.values(COMMENTERS).map((c) => c.email),
    emailFor(P.alice),
    emailFor(P.cara),
    emailFor(P.fern),
    emailFor(P.gita),
    emailFor(P.harry),
  ];

  const labelToKey = new Map<string, string>();
  for (const seed of seeds) {
    labelToKey.set(seed.label, hash(`${promptId}:${seed.label}`).slice(0, 12));
  }

  return seeds.map((seed, index) => {
    const key = labelToKey.get(seed.label)!;
    const parentKey = seed.parent ? labelToKey.get(seed.parent) : undefined;
    const createdAt = commentTimestamp(seed.daysAgo, seed.hoursAgo);
    const author = commenterEmailFor(seed.by);

    // Upvote roster — deterministic slice of the pool, rotating by the
    // comment's index so neighbouring comments don't share the same
    // first voter. The author of the comment never upvotes their own;
    // capping at `pool.length - 1` (i.e. the pool minus the author)
    // prevents an unsatisfiable upvote target from looping forever.
    const upvoteEmails: string[] = [];
    if (seed.upvotes > 0) {
      const maxRoster = Math.max(0, upvoterPool.length - 1);
      const target = Math.min(seed.upvotes, maxRoster);
      let cursor = (index * 3) % upvoterPool.length;
      let safetyTrips = upvoterPool.length * 2;
      while (upvoteEmails.length < target && safetyTrips-- > 0) {
        const candidate = upvoterPool[cursor]!;
        if (candidate !== author && !upvoteEmails.includes(candidate)) {
          upvoteEmails.push(candidate);
        }
        cursor = (cursor + 1) % upvoterPool.length;
      }
    }

    return {
      _key: key,
      _type: "promptComment",
      userEmail: author,
      body: seed.body,
      createdAt,
      ...(parentKey ? { parentKey } : {}),
      upvotes: upvoteEmails.map((email, i) => ({
        _key: hash(`${promptId}:${seed.label}:upvote:${i}`).slice(0, 12),
        _type: "promptCommentUpvote",
        userEmail: email,
        createdAt: commentTimestamp(Math.max(0, seed.daysAgo - 1)),
      })),
    };
  });
}

interface UpvoteEntry {
  _key: string;
  _type: "promptUpvote";
  userEmail: string;
  createdAt: string;
}

/**
 * Materialise a fixed-count upvote roster on a prompt — picks
 * deterministic emails from the commenter pool so each prompt gets
 * a believable count without coupling it to the actual commenters.
 */
function buildPromptUpvotes(promptId: string, count: number): UpvoteEntry[] {
  const pool: string[] = [
    ...Object.values(COMMENTERS).map((c) => c.email),
    emailFor(P.alice),
    emailFor(P.cara),
    emailFor(P.fern),
    emailFor(P.gita),
    emailFor(P.harry),
  ];
  const out: UpvoteEntry[] = [];
  for (let i = 0; i < count && i < pool.length; i++) {
    out.push({
      _key: hash(`${promptId}:upvote:${i}`).slice(0, 12),
      _type: "promptUpvote",
      userEmail: pool[i]!,
      createdAt: daysAgo(30 + (i % 60)),
    });
  }
  return out;
}

interface PromptSeed {
  id: string;
  title: string;
  summary: string;
  body: string;
  tool: string;
  tags: string[];
  authorId: string;
  createdDaysAgo: number;
  createdHour: number;
  competitionMonth?: string;
  upvoteCount: number;
  comments: CommentSeed[];
}

const promptSeeds: PromptSeed[] = [
  {
    id: "demo-prompt-director-summary",
    title: "Summarise this Crown Court bundle for jury usefulness in 5 bullets",
    summary:
      "Bundle-triage starter — get a Director-grade read-down on a Crown Court bundle in 5 minutes.",
    body:
      "You are summarising a Crown Court bundle for a Director who has 5 minutes.\n\n" +
      "Use ONLY the text below. Write exactly five bullets, each one line. " +
      "Cover: what the bundle is about at the level a non-specialist can " +
      "grasp, the biggest open evidential question, the bundle's stage in " +
      "the trial timeline, the next decision needed from the Director, and " +
      "the ask. No preamble, no closing line. If a bullet cannot be filled " +
      "from the text, say 'not in the brief' rather than guess.",
    tool: "claude",
    tags: ["#Operations", "#Communications"],
    authorId: P.alice,
    createdDaysAgo: 20,
    createdHour: 11,
    upvoteCount: 17,
    comments: [
      {
        label: "kudos-emma",
        by: "emma",
        daysAgo: 18,
        body: "Used this for a 9am steerco read-out on a backlog progress note — Director said it was the cleanest summary she'd had in months. Saved me at least an hour on backlog progress reporting this week.",
        upvotes: 14,
      },
      {
        label: "challenge-frank",
        by: "frank",
        daysAgo: 12,
        body: "It will happily invent a 'biggest open risk' if you don't actually feed it the brief. Worth saying that explicitly in the prompt — I added 'use ONLY the text below' and it stopped hallucinating.",
        upvotes: 22,
      },
      {
        label: "reply-emma",
        by: "alice",
        daysAgo: 11,
        parent: "challenge-frank",
        body: "Good catch. I'll fold that into v2 of the prompt. The 'no preamble, no closing line' line was meant to handle some of that but you're right, it's not enough.",
        upvotes: 6,
      },
      {
        label: "q-natalie",
        by: "natalie",
        daysAgo: 5,
        body: "Has anyone tried this against a longer brief (10+ pages)? It seems to lose the thread on the 'next decision needed' bullet for me.",
        upvotes: 3,
      },
      {
        label: "reply-natalie",
        by: "fern",
        daysAgo: 3,
        parent: "q-natalie",
        body: "Yes — for anything 5 pages+ I split it into sections first and ask for a 1-bullet summary per section, then ask the model to compress those into the final 5. Gets you a much tighter answer.",
        upvotes: 9,
      },
      {
        label: "kudos-rob",
        by: "rob",
        daysAgo: 1,
        body: "Stealing this. Will report back after the next portfolio review.",
        upvotes: 1,
      },
    ],
  },
  {
    id: "demo-prompt-acceptance-tests",
    title:
      "Convert these draft acceptance criteria for a backlog-impacting project into a test list",
    summary:
      "Useful when handing a story over to QA on a project that links the Crown Court backlog strand.",
    body:
      "Given the following acceptance criteria for a project that links " +
      "strand 1 (Crown Court backlog reduction), produce a numbered list of " +
      "tests. For each test, give: the precondition, the action, and the " +
      "expected observable outcome. Mark anything that needs a fixture or " +
      "test data with a TODO line. If an acceptance criterion implies a " +
      "claim about the project's contribution to backlog reduction, add a " +
      "test that verifies the contribution is actually measurable in the " +
      "data the team has — don't let the claim ride.",
    tool: "copilot",
    tags: ["#Tech", "#Operations"],
    authorId: P.cara,
    createdDaysAgo: 35,
    createdHour: 14,
    upvoteCount: 24,
    comments: [
      {
        label: "kudos-priya",
        by: "priya",
        daysAgo: 30,
        body: "This saved me about 90 minutes on a story handover yesterday. The TODO markers for fixture data are the bit I keep forgetting on my own.",
        upvotes: 18,
      },
      {
        label: "challenge-jas",
        by: "jas",
        daysAgo: 22,
        body: "Two notes: (1) Copilot in chat-mode adds Gherkin syntax even when you say 'numbered list'. Adding 'do not use Given/When/Then keywords' fixed it for me. (2) The output is too verbose for a quick standup — I now ask for the precondition + action on one line each.",
        upvotes: 11,
      },
      {
        label: "reply-jas",
        by: "cara",
        daysAgo: 21,
        parent: "challenge-jas",
        body: "Both fair. I'll update the canonical version with both nudges. Thanks Jas.",
        upvotes: 4,
      },
      {
        label: "q-chuks",
        by: "chuks",
        daysAgo: 14,
        body: "Does this work for non-functional acceptance criteria (perf, accessibility)? I tried it on an a11y AC and it gave me UI-driven steps which weren't what I wanted.",
        upvotes: 5,
      },
    ],
  },
  {
    id: "demo-prompt-tier2-risk-register",
    title:
      "Suggest a risk register for a Tier 2 listings forecasting project",
    summary:
      "Cold-start a risk register for a listings forecasting pilot; not a substitute for one.",
    body:
      "I am preparing a Tier 2 risk register for a listings forecasting " +
      "project. Suggest between 4 and 10 risks (only ones you can name a " +
      "concrete trigger for), each with: likelihood (low/med/high), impact " +
      "(low/med/high), mitigation, and owner role. Keep wording neutral; " +
      "avoid predicting any specific person's behaviour. Cover at least " +
      "one risk per area: data quality on the input feed, model drift " +
      "across listing seasons, user trust in the explainer, and the " +
      "downstream effect on cracked-trial outcomes if the forecast is " +
      "wrong.",
    tool: "chatgpt-enterprise",
    tags: ["#Policy", "#Operations"],
    authorId: P.harry,
    createdDaysAgo: 12,
    createdHour: 9,
    upvoteCount: 9,
    comments: [
      {
        label: "kudos-yvonne",
        by: "yvonne",
        daysAgo: 10,
        body: "Good starter — I treated the output as raw material and rewrote about half. The 'neutral wording' line is doing real work; the first version I tried without it had a couple of risks that read like accusations.",
        upvotes: 12,
      },
      {
        label: "challenge-lina",
        by: "lina",
        daysAgo: 7,
        body: "It will give you 8 plausible-looking risks even when only 4 actually apply. Don't trust the count — let it give as many as it can defend, then trim.",
        upvotes: 8,
      },
      {
        label: "reply-lina",
        by: "harry",
        daysAgo: 6,
        parent: "challenge-lina",
        body: "Agreed. v2 of the prompt will say 'between 4 and 10, only ones you can name a concrete trigger for'.",
        upvotes: 5,
      },
    ],
  },
  {
    id: "demo-prompt-show-and-tell",
    title:
      "Draft a one-page note explaining the listing-capacity model for the SRO",
    summary:
      "Turn a forecasting model's update log into a one-pager an SRO can read in five minutes.",
    body:
      "Read the following project update log for a listings forecasting " +
      "model. Write a one-page note for the SRO: 30 seconds of context " +
      "(what the model is and why it exists), 3 minutes on the user " +
      "outcome and what changed in this update window, 1 minute on what's " +
      "next, 30 seconds on one open question to put to the audience. The " +
      "audience is leaders who haven't seen this project before. Avoid " +
      "jargon; explain any acronym the first time it appears.",
    tool: "claude",
    tags: ["#Communications"],
    authorId: P.fern,
    createdDaysAgo: 8,
    createdHour: 16,
    competitionMonth: "2026-04",
    upvoteCount: 31,
    comments: [
      {
        label: "kudos-emma2",
        by: "emma",
        daysAgo: 6,
        body: "This is the one. I rehearsed straight off the output and only tweaked the open question. Two delivery teams have nicked it from me already.",
        upvotes: 25,
      },
      {
        label: "challenge-rob",
        by: "rob",
        daysAgo: 4,
        body: "The 30s context section is tight. Worth being explicit about who the audience is — I added 'audience: leaders who haven't seen this project before' and the context paragraph got noticeably better.",
        upvotes: 13,
      },
      {
        label: "reply-rob",
        by: "fern",
        daysAgo: 3,
        parent: "challenge-rob",
        body: "Yes — I'll fold the audience hint into the prompt template. Good shout.",
        upvotes: 7,
      },
      {
        label: "q-priya",
        by: "priya",
        daysAgo: 2,
        body: "Anyone got a version of this for a 15-minute slot? Same structure or do you stretch the user-outcome section?",
        upvotes: 2,
      },
    ],
  },
  {
    id: "demo-prompt-bundle-checklist",
    title:
      "Triage these listings against likely cracked-trial risk indicators",
    summary:
      "Reusable triage script for Listings Officers screening tomorrow's list against cracked-trial risk.",
    body:
      "Given the following list entries (each with case reference, " +
      "interpreter requirement, witness count, and any flags from the " +
      "case-progression record), produce a triage table. For each entry, " +
      "give: a likely-risk score (low/med/high), the top one or two " +
      "indicators driving the score, and a suggested intervention before " +
      "the day of trial. Use plain English. If an entry doesn't have " +
      "enough data to score, mark it 'insufficient data' rather than " +
      "guessing.",
    tool: "m365-copilot",
    tags: ["#Operations", "#Legal"],
    authorId: P.cara,
    createdDaysAgo: 50,
    createdHour: 10,
    upvoteCount: 12,
    comments: [
      {
        label: "kudos-natalie",
        by: "natalie",
        daysAgo: 45,
        body: "Used this on a Crown Court bundle last week — the 'redaction completeness' check caught two pages that hadn't been done. Worth its weight.",
        upvotes: 21,
      },
      {
        label: "q-frank",
        by: "frank",
        daysAgo: 38,
        body: "Have you got a Magistrates' version? The exhibit-reference column doesn't always apply for us.",
        upvotes: 4,
      },
      {
        label: "reply-frank",
        by: "cara",
        daysAgo: 37,
        parent: "q-frank",
        body: "Not yet — drop me a line and we'll sketch one. Most of the checklist transfers; it's just the exhibit row that needs swapping.",
        upvotes: 2,
      },
      {
        label: "challenge-jas",
        by: "jas",
        daysAgo: 20,
        body: "Heads up: 'accessibility considerations' is interpreted as 'PDF tags' by Copilot. If you mean physical-bundle accessibility (font size, paper colour) you need to spell that out.",
        upvotes: 7,
      },
    ],
  },
  {
    id: "demo-prompt-listings-explainer",
    title:
      "Recommend GROQ to find Tier-1 projects linked to the cracked-trial strand",
    summary:
      "Cold-start GROQ for portfolio admins answering 'what's the highest-tier work on backlog reduction?'",
    body:
      "Write a GROQ query against the Sanity dataset to return Tier 1 " +
      "projects linked to the strand that owns Crown Court backlog " +
      "reduction. The Project document type is `project` with fields " +
      "`governanceTier`, `actionPlanLinks` (an array of references to " +
      "`action`), `name`, `projectStage`. The action document type is " +
      "`action` with field `name`. Return: project name, stage, the " +
      "linked action name(s), the delivery owner email. Order by stage " +
      "(scale first, then pilot, then scan, then idea). Use modern GROQ " +
      "syntax; explain any reference traversal in a one-line comment.",
    tool: "claude",
    tags: ["#Operations", "#Data Analysis"],
    authorId: P.alice,
    createdDaysAgo: 15,
    createdHour: 13,
    upvoteCount: 14,
    comments: [
      {
        label: "kudos-yvonne",
        by: "yvonne",
        daysAgo: 12,
        body: "Listings Officers I tested with said this was the first time they understood the forecast without going back to the analyst. Big unlock.",
        upvotes: 19,
      },
      {
        label: "q-chuks",
        by: "chuks",
        daysAgo: 8,
        body: "Does the 'avoid percentages without context' rule break if I want a confidence interval? My drafts kept stripping the +/- band.",
        upvotes: 3,
      },
      {
        label: "reply-chuks",
        by: "alice",
        daysAgo: 7,
        parent: "q-chuks",
        body: "Yes — for confidence intervals say 'numbers like +/- X are allowed where they describe uncertainty'. The 'no percentages without context' line is really aimed at things like 'down 12%' with no baseline.",
        upvotes: 6,
      },
    ],
  },
  {
    id: "demo-prompt-faq-rewrite",
    title:
      "Translate this victim communication into Welsh and back-check the meaning",
    summary:
      "Two-pass translation prompt for victim-facing communications that must read identically in Welsh and English.",
    body:
      "You will translate the following victim communication into Welsh, " +
      "then back-translate the Welsh into English so the meaning can be " +
      "checked side-by-side. Use plain Welsh suitable for a reading age " +
      "of 9-11. Keep factual claims about service properties (timing, " +
      "process steps) intact; do not add marketing language. Output " +
      "three sections: 1) Welsh, 2) literal back-translation into " +
      "English, 3) any phrases where the literal back-translation drifts " +
      "from the original — these need a Welsh-speaking reviewer.",
    tool: "claude",
    tags: ["#Communications", "#Policy"],
    authorId: P.fern,
    createdDaysAgo: 40,
    createdHour: 9,
    upvoteCount: 22,
    comments: [
      {
        label: "kudos-lina",
        by: "lina",
        daysAgo: 36,
        body: "I ran twelve FAQs through this in one sitting. Eight came back ready to ship; the other four were 'wrong but obviously wrong' which is fine because that's quicker to fix than a stilted draft.",
        upvotes: 16,
      },
      {
        label: "challenge-emma",
        by: "emma",
        daysAgo: 28,
        body: "Heads up: 'no marketing language' is interpreted strictly. If your FAQ is about a service that genuinely is faster/cheaper, you'll need to add 'factual claims about service properties are allowed'.",
        upvotes: 10,
      },
      {
        label: "q-priya",
        by: "priya",
        daysAgo: 14,
        body: "Should we also pin a 'reading age 9' constraint? GDS recommends 9-11 IIRC.",
        upvotes: 4,
      },
      {
        label: "reply-priya",
        by: "fern",
        daysAgo: 13,
        parent: "q-priya",
        body: "Good idea — adding that to v2. Reading-age is the better steer than 'no marketing language' on its own.",
        upvotes: 5,
      },
    ],
  },
  {
    id: "demo-prompt-meeting-actions",
    title: "Generate plausible test data for the disclosure routing engine",
    summary:
      "Test-data generator for the disclosure routing engine — plausible-but-fictional, never real cases.",
    body:
      "Generate plausible-but-fictional test data for the disclosure " +
      "routing engine. Produce 20 disclosure items with: a fictional " +
      "case reference, item type (statement, exhibit, redacted material, " +
      "third-party material), sensitivity (low/med/high), and an " +
      "expected routing target (defence, third party, redaction queue). " +
      "Do NOT use real case identifiers, real defendant names, real " +
      "victim or witness names, or real Crown Court name plus case " +
      "combinations that could be mistaken for a real case. Use " +
      "obviously test-shaped values (e.g. case ref TEST-2026-0001).",
    tool: "m365-copilot",
    tags: ["#Operations"],
    authorId: P.gita,
    createdDaysAgo: 5,
    createdHour: 14,
    upvoteCount: 6,
    comments: [
      {
        label: "kudos-rob",
        by: "rob",
        daysAgo: 4,
        body: "The 'needs clarification' bucket is the killer feature. Every other transcript-summariser I've tried just guesses; this one flags it instead.",
        upvotes: 17,
      },
      {
        label: "q-natalie",
        by: "natalie",
        daysAgo: 0,
        hoursAgo: 14,
        body: "Anyone tried this on a transcript with overlapping speakers? Mine had two people commit to the same thing in different ways and the output captured it twice.",
        upvotes: 1,
      },
      {
        label: "reply-natalie",
        by: "gita",
        daysAgo: 0,
        hoursAgo: 8,
        parent: "q-natalie",
        body: "Yes — I add 'deduplicate commitments where the same owner-action pair appears more than once'. Not perfect but cuts the duplicates by ~80%.",
        upvotes: 3,
      },
    ],
  },
];

const prompts: SanityDoc[] = promptSeeds.map((seed) => ({
  _id: seed.id,
  _type: "prompt",
  title: seed.title,
  summary: seed.summary,
  body: seed.body,
  tool: seed.tool,
  tags: seed.tags,
  author: ref(seed.authorId),
  createdAt: daysAgo(seed.createdDaysAgo, seed.createdHour),
  ...(seed.competitionMonth ? { competitionMonth: seed.competitionMonth } : {}),
  upvotes: buildPromptUpvotes(seed.id, seed.upvoteCount),
  comments: buildComments(seed.id, seed.comments),
}));

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
    title: "Crime Portfolio Show & Tell — Backlog reduction theme",
    category: "Show & Tell",
    location: "Online (Teams)",
    startsDays: -7,
    durationHours: 1,
    body: [
      "Two delivery teams demoed contributions to the Crown Court backlog reduction strand: bundle triage at scale and the cracked-trial root-cause classifier in pilot. No slides required to attend.",
    ],
  },
  {
    id: "demo-event-action-plan-review",
    title: "Action Plan strand-2 review (Listings & capacity)",
    category: "Workshop",
    location: "102 Petty France, Room 3.04",
    startsDays: 4,
    durationHours: 2,
    body: [
      "Walking through every project linked to the listings & judicial capacity strand. Owners bring a one-pager covering listing-accuracy delta and any open capacity risk.",
    ],
  },
  {
    id: "demo-event-leveson-readiness",
    title: "Leveson Review readiness session — DTS Crime delivery teams",
    category: "Workshop",
    location: "102 Petty France, Boardroom",
    startsDays: 11,
    durationHours: 2,
    body: [
      "Walk-through of how DTS Crime delivery teams stay ready to support whichever recommendations the Independent Review of the Criminal Courts produces. Tracked against the published terms of reference. Recommendations may evolve; framing will be refreshed as they land.",
    ],
  },
  {
    id: "demo-event-cracked-trial-wg",
    title: "Cracked-trial root-cause working group",
    category: "Working group",
    location: "Online (Teams)",
    startsDays: 18,
    durationHours: 1,
    body: [
      "Working group review of the cracked-trial root-cause classifier output. Listings, Crown Court ops, and Service Design representatives review the top five causes from the latest measurement window and agree intervention owners.",
    ],
  },
  {
    id: "demo-event-welcome-new-starters",
    title: "Welcome session for new starters in DTS Crime",
    category: "Recurring",
    location: "102 Petty France, Room 2.11",
    startsDays: -3,
    durationHours: 1,
    body: [
      "Recurring onboarding for new starters across DTS Crime: a tour of the portfolio, the four action plan strands, the Crown Court backlog framing, and where to find help. Held the first Tuesday of the month.",
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
    documentId: "demo-proj-bundle-triage",
    documentType: "project",
    field: "projectStage",
    before: JSON.stringify("pilot"),
    after: JSON.stringify("scale"),
    userEmail: emailFor(P.alice),
    timestamp: daysAgo(49, 9),
  },
  {
    _id: "demo-changelog-2",
    _type: "changeLog",
    documentId: "demo-proj-bundle-triage",
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
    documentId: "demo-proj-mode-of-trial",
    documentType: "project",
    field: "tieringAssessment.legalRegulatoryImplications",
    before: JSON.stringify(2),
    after: JSON.stringify(2),
    userEmail: emailFor(P.harry),
    timestamp: daysAgo(31, 11),
  },
  {
    _id: "demo-changelog-4",
    _type: "changeLog",
    documentId: "demo-proj-listings-forecasting",
    documentType: "project",
    field: "description",
    before: JSON.stringify("(initial submission)"),
    after: JSON.stringify("(edited to name the cracked-trial outcome)"),
    userEmail: emailFor(P.alice),
    timestamp: daysAgo(22, 14),
  },
  {
    _id: "demo-changelog-5",
    _type: "changeLog",
    documentId: "demo-proj-plea-before-venue",
    documentType: "project",
    field: "projectStage",
    before: JSON.stringify("scan"),
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
  ...commenterPeople,
  ...actions,
  ...projects,
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
    { label: "reference data", docs: [...groups, ...directorates, ...businessAreas, ...capabilities, ...people, ...commenterPeople, ...actions] },
    { label: "projects", docs: projects },
    { label: "content", docs: [...learning, ...prompts, ...events] },
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
