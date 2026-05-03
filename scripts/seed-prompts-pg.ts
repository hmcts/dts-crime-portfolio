/**
 * Seed the Postgres prompts surface with the same eight demo prompts that
 * previously lived in `scripts/seed-demo.ts` (Sanity). Used by:
 *
 * - Local dev: `pnpm seed:prompts` after `docker compose up -d` and
 *   `pnpm db:migrate`.
 * - GitHub Actions `seed-demo` workflow: runs after the Sanity seed so
 *   the preview environment has both reference data (Sanity) and
 *   prompts (Postgres) populated.
 *
 * The script is **idempotent**: deterministic ids let Postgres's
 * `INSERT ... ON CONFLICT DO UPDATE` collapse re-runs into a refresh
 * rather than duplicates, mirroring the `createOrReplace` posture of
 * the Sanity seed.
 *
 * Spec: openspec/specs/prompts-library/spec.md, decisions/2026-05-03-postgres-prompts-spike.md.
 */

import { createHash } from "node:crypto";

import { sql as drizzleSql, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/lib/db/client";
import {
  promptCommentUpvotes,
  promptComments,
  promptUpvotes,
  prompts,
} from "@/lib/db/schema";

interface AuthorFixture {
  email: string;
  name: string;
}

const AUTHORS: Record<string, AuthorFixture> = {
  alice: { email: "alice.owner1@hmcts.net", name: "Alice Owner1" },
  cara: { email: "cara.lead2@justice.gov.uk", name: "Cara Lead2" },
  fern: { email: "fern.product3@hmcts.net", name: "Fern Product3" },
  gita: { email: "gita.portfolio4@justice.gov.uk", name: "Gita Portfolio4" },
  harry: { email: "harry.risk5@hmcts.net", name: "Harry Risk5" },
};

const COMMENTERS: Record<string, AuthorFixture> = {
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

function fixtureFor(key: string): AuthorFixture {
  return (
    AUTHORS[key] ??
    COMMENTERS[key] ??
    (() => {
      throw new Error(`Unknown person key: ${key}`);
    })()
  );
}

function authorSeedFor(email: string): string {
  return createHash("sha256").update(email).digest("hex").slice(0, 16);
}

function hashId(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 24);
}

function daysAgoIso(daysAgoCount: number, hour = 9): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysAgoCount);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

function commentTimestamp(daysAgoCount: number, hoursAgoCount = 0): Date {
  if (daysAgoCount === 0 && hoursAgoCount > 0) {
    const d = new Date();
    d.setUTCHours(d.getUTCHours() - hoursAgoCount, 0, 0, 0);
    return d;
  }
  return daysAgoIso(daysAgoCount, 9);
}

interface CommentSeed {
  label: string;
  by: keyof typeof AUTHORS | keyof typeof COMMENTERS;
  daysAgo: number;
  hoursAgo?: number;
  body: string;
  upvotes: number;
  parent?: string;
}

interface PromptSeed {
  id: string;
  title: string;
  summary: string;
  body: string;
  tool: string;
  tags: string[];
  author: keyof typeof AUTHORS;
  createdDaysAgo: number;
  createdHour: number;
  competitionMonth?: string;
  upvoteCount: number;
  comments: CommentSeed[];
}

const PROMPT_SEEDS: PromptSeed[] = [
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
    author: "alice",
    createdDaysAgo: 20,
    createdHour: 11,
    upvoteCount: 17,
    comments: [
      {
        label: "kudos-emma",
        by: "emma",
        daysAgo: 18,
        body:
          "Used this for a 9am steerco read-out on a backlog progress note — Director said it was the cleanest summary she'd had in months. Saved me at least an hour on backlog progress reporting this week.",
        upvotes: 14,
      },
      {
        label: "challenge-frank",
        by: "frank",
        daysAgo: 12,
        body:
          "It will happily invent a 'biggest open risk' if you don't actually feed it the brief. Worth saying that explicitly in the prompt — I added 'use ONLY the text below' and it stopped hallucinating.",
        upvotes: 22,
      },
      {
        label: "reply-emma",
        by: "alice",
        daysAgo: 11,
        parent: "challenge-frank",
        body:
          "Good catch. I'll fold that into v2 of the prompt. The 'no preamble, no closing line' line was meant to handle some of that but you're right, it's not enough.",
        upvotes: 6,
      },
      {
        label: "q-natalie",
        by: "natalie",
        daysAgo: 5,
        body:
          "Has anyone tried this against a longer brief (10+ pages)? It seems to lose the thread on the 'next decision needed' bullet for me.",
        upvotes: 3,
      },
      {
        label: "reply-natalie",
        by: "fern",
        daysAgo: 3,
        parent: "q-natalie",
        body:
          "Yes — for anything 5 pages+ I split it into sections first and ask for a 1-bullet summary per section, then ask the model to compress those into the final 5. Gets you a much tighter answer.",
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
    author: "cara",
    createdDaysAgo: 35,
    createdHour: 14,
    upvoteCount: 24,
    comments: [
      {
        label: "kudos-priya",
        by: "priya",
        daysAgo: 30,
        body:
          "This saved me about 90 minutes on a story handover yesterday. The TODO markers for fixture data are the bit I keep forgetting on my own.",
        upvotes: 18,
      },
      {
        label: "challenge-jas",
        by: "jas",
        daysAgo: 22,
        body:
          "Two notes: (1) Copilot in chat-mode adds Gherkin syntax even when you say 'numbered list'. Adding 'do not use Given/When/Then keywords' fixed it for me. (2) The output is too verbose for a quick standup — I now ask for the precondition + action on one line each.",
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
        body:
          "Does this work for non-functional acceptance criteria (perf, accessibility)? I tried it on an a11y AC and it gave me UI-driven steps which weren't what I wanted.",
        upvotes: 5,
      },
    ],
  },
  {
    id: "demo-prompt-tier2-risk-register",
    title: "Suggest a risk register for a Tier 2 listings forecasting project",
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
    author: "harry",
    createdDaysAgo: 12,
    createdHour: 9,
    upvoteCount: 9,
    comments: [
      {
        label: "kudos-yvonne",
        by: "yvonne",
        daysAgo: 10,
        body:
          "Good starter — I treated the output as raw material and rewrote about half. The 'neutral wording' line is doing real work; the first version I tried without it had a couple of risks that read like accusations.",
        upvotes: 12,
      },
      {
        label: "challenge-lina",
        by: "lina",
        daysAgo: 7,
        body:
          "It will give you 8 plausible-looking risks even when only 4 actually apply. Don't trust the count — let it give as many as it can defend, then trim.",
        upvotes: 8,
      },
      {
        label: "reply-lina",
        by: "harry",
        daysAgo: 6,
        parent: "challenge-lina",
        body:
          "Agreed. v2 of the prompt will say 'between 4 and 10, only ones you can name a concrete trigger for'.",
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
    author: "fern",
    createdDaysAgo: 8,
    createdHour: 16,
    competitionMonth: "2026-04",
    upvoteCount: 31,
    comments: [
      {
        label: "kudos-emma2",
        by: "emma",
        daysAgo: 6,
        body:
          "This is the one. I rehearsed straight off the output and only tweaked the open question. Two delivery teams have nicked it from me already.",
        upvotes: 25,
      },
      {
        label: "challenge-rob",
        by: "rob",
        daysAgo: 4,
        body:
          "The 30s context section is tight. Worth being explicit about who the audience is — I added 'audience: leaders who haven't seen this project before' and the context paragraph got noticeably better.",
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
        body:
          "Anyone got a version of this for a 15-minute slot? Same structure or do you stretch the user-outcome section?",
        upvotes: 2,
      },
    ],
  },
  {
    id: "demo-prompt-bundle-checklist",
    title: "Triage these listings against likely cracked-trial risk indicators",
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
    author: "cara",
    createdDaysAgo: 50,
    createdHour: 10,
    upvoteCount: 12,
    comments: [
      {
        label: "kudos-natalie",
        by: "natalie",
        daysAgo: 45,
        body:
          "Used this on a Crown Court bundle last week — the 'redaction completeness' check caught two pages that hadn't been done. Worth its weight.",
        upvotes: 21,
      },
      {
        label: "q-frank",
        by: "frank",
        daysAgo: 38,
        body:
          "Have you got a Magistrates' version? The exhibit-reference column doesn't always apply for us.",
        upvotes: 4,
      },
      {
        label: "reply-frank",
        by: "cara",
        daysAgo: 37,
        parent: "q-frank",
        body:
          "Not yet — drop me a line and we'll sketch one. Most of the checklist transfers; it's just the exhibit row that needs swapping.",
        upvotes: 2,
      },
      {
        label: "challenge-jas",
        by: "jas",
        daysAgo: 20,
        body:
          "Heads up: 'accessibility considerations' is interpreted as 'PDF tags' by Copilot. If you mean physical-bundle accessibility (font size, paper colour) you need to spell that out.",
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
    author: "alice",
    createdDaysAgo: 15,
    createdHour: 13,
    upvoteCount: 14,
    comments: [
      {
        label: "kudos-yvonne",
        by: "yvonne",
        daysAgo: 12,
        body:
          "Listings Officers I tested with said this was the first time they understood the forecast without going back to the analyst. Big unlock.",
        upvotes: 19,
      },
      {
        label: "q-chuks",
        by: "chuks",
        daysAgo: 8,
        body:
          "Does the 'avoid percentages without context' rule break if I want a confidence interval? My drafts kept stripping the +/- band.",
        upvotes: 3,
      },
      {
        label: "reply-chuks",
        by: "alice",
        daysAgo: 7,
        parent: "q-chuks",
        body:
          "Yes — for confidence intervals say 'numbers like +/- X are allowed where they describe uncertainty'. The 'no percentages without context' line is really aimed at things like 'down 12%' with no baseline.",
        upvotes: 6,
      },
    ],
  },
  {
    id: "demo-prompt-faq-rewrite",
    title: "Translate this victim communication into Welsh and back-check the meaning",
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
    author: "fern",
    createdDaysAgo: 40,
    createdHour: 9,
    upvoteCount: 22,
    comments: [
      {
        label: "kudos-lina",
        by: "lina",
        daysAgo: 36,
        body:
          "I ran twelve FAQs through this in one sitting. Eight came back ready to ship; the other four were 'wrong but obviously wrong' which is fine because that's quicker to fix than a stilted draft.",
        upvotes: 16,
      },
      {
        label: "challenge-emma",
        by: "emma",
        daysAgo: 28,
        body:
          "Heads up: 'no marketing language' is interpreted strictly. If your FAQ is about a service that genuinely is faster/cheaper, you'll need to add 'factual claims about service properties are allowed'.",
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
        body:
          "Good idea — adding that to v2. Reading-age is the better steer than 'no marketing language' on its own.",
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
    author: "gita",
    createdDaysAgo: 5,
    createdHour: 14,
    upvoteCount: 6,
    comments: [
      {
        label: "kudos-rob",
        by: "rob",
        daysAgo: 4,
        body:
          "The 'needs clarification' bucket is the killer feature. Every other transcript-summariser I've tried just guesses; this one flags it instead.",
        upvotes: 17,
      },
      {
        label: "q-natalie",
        by: "natalie",
        daysAgo: 0,
        hoursAgo: 14,
        body:
          "Anyone tried this on a transcript with overlapping speakers? Mine had two people commit to the same thing in different ways and the output captured it twice.",
        upvotes: 1,
      },
      {
        label: "reply-natalie",
        by: "gita",
        daysAgo: 0,
        hoursAgo: 8,
        parent: "q-natalie",
        body:
          "Yes — I add 'deduplicate commitments where the same owner-action pair appears more than once'. Not perfect but cuts the duplicates by ~80%.",
        upvotes: 3,
      },
    ],
  },
];

const UPVOTER_POOL: AuthorFixture[] = [
  ...Object.values(COMMENTERS),
  AUTHORS.alice!,
  AUTHORS.cara!,
  AUTHORS.fern!,
  AUTHORS.gita!,
  AUTHORS.harry!,
];

interface BuiltComment {
  id: string;
  parentId: string | null;
  authorEmail: string;
  authorName: string;
  authorSeed: string;
  body: string;
  createdAt: Date;
  upvotes: Array<{ userEmail: string; createdAt: Date }>;
}

function buildComments(promptId: string, seeds: CommentSeed[]): BuiltComment[] {
  const labelToId = new Map<string, string>();
  for (const seed of seeds) {
    labelToId.set(seed.label, hashId(`${promptId}:${seed.label}`));
  }
  return seeds.map((seed, index) => {
    const author = fixtureFor(seed.by);
    const upvoteEmails: string[] = [];
    if (seed.upvotes > 0) {
      const target = Math.min(seed.upvotes, UPVOTER_POOL.length - 1);
      let cursor = (index * 3) % UPVOTER_POOL.length;
      let safety = UPVOTER_POOL.length * 2;
      while (upvoteEmails.length < target && safety-- > 0) {
        const candidate = UPVOTER_POOL[cursor]!.email;
        if (candidate !== author.email && !upvoteEmails.includes(candidate)) {
          upvoteEmails.push(candidate);
        }
        cursor = (cursor + 1) % UPVOTER_POOL.length;
      }
    }
    return {
      id: labelToId.get(seed.label)!,
      parentId: seed.parent ? labelToId.get(seed.parent) ?? null : null,
      authorEmail: author.email,
      authorName: author.name,
      authorSeed: authorSeedFor(author.email),
      body: seed.body,
      createdAt: commentTimestamp(seed.daysAgo, seed.hoursAgo),
      upvotes: upvoteEmails.map((email) => ({
        userEmail: email,
        createdAt: commentTimestamp(Math.max(0, seed.daysAgo - 1)),
      })),
    };
  });
}

function buildPromptUpvotes(count: number): Array<{ userEmail: string; createdAt: Date }> {
  const out: Array<{ userEmail: string; createdAt: Date }> = [];
  for (let i = 0; i < count && i < UPVOTER_POOL.length; i += 1) {
    out.push({
      userEmail: UPVOTER_POOL[i]!.email,
      createdAt: daysAgoIso(30 + (i % 60)),
    });
  }
  return out;
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL must be set. Local: docker compose up -d && export " +
        "DATABASE_URL=postgres://crime:crime@localhost:5432/crime",
    );
    process.exit(1);
  }
  const db = getDb();
  console.log(`Seeding ${PROMPT_SEEDS.length} prompts into Postgres …`);

  for (const seed of PROMPT_SEEDS) {
    const author = AUTHORS[seed.author];
    if (!author) throw new Error(`Unknown author key: ${seed.author}`);
    const createdAt = daysAgoIso(seed.createdDaysAgo, seed.createdHour);

    // Wipe-and-rewrite each prompt to keep the seed strictly idempotent.
    // Cascade deletes cover the comments + per-comment upvote rosters in
    // one shot. The prompt-level upvotes table cascades from `prompts.id`
    // via FK, so deleting the prompt row clears those too — and the
    // re-insert below restores them with deterministic content.
    await db.delete(prompts).where(eq(prompts.id, seed.id));

    await db.insert(prompts).values({
      id: seed.id,
      title: seed.title,
      summary: seed.summary,
      body: seed.body,
      tool: seed.tool,
      tags: seed.tags,
      authorEmail: author.email,
      authorName: author.name,
      authorSeed: authorSeedFor(author.email),
      competitionMonth: seed.competitionMonth ?? null,
      createdAt,
    });

    const upvoteRows = buildPromptUpvotes(seed.upvoteCount).map((row) => ({
      promptId: seed.id,
      ...row,
    }));
    if (upvoteRows.length > 0) {
      await db.insert(promptUpvotes).values(upvoteRows);
    }

    const comments = buildComments(seed.id, seed.comments);
    if (comments.length > 0) {
      await db.insert(promptComments).values(
        comments.map((c) => ({
          id: c.id,
          promptId: seed.id,
          parentId: c.parentId,
          authorEmail: c.authorEmail,
          authorName: c.authorName,
          authorSeed: c.authorSeed,
          body: c.body,
          createdAt: c.createdAt,
        })),
      );
      const flatUpvotes = comments.flatMap((c) =>
        c.upvotes.map((u) => ({ commentId: c.id, ...u })),
      );
      if (flatUpvotes.length > 0) {
        await db.insert(promptCommentUpvotes).values(flatUpvotes);
      }
    }

    console.log(`  ✓ ${seed.id} (${seed.upvoteCount} upvotes, ${seed.comments.length} comments)`);
  }

  // Sanity-check the totals so a CI re-run that silently writes nothing is loud.
  const [{ count: promptCount }] = await db
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(prompts);
  console.log(`Done. ${promptCount} prompts in the database.`);
  await closeDb();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await closeDb();
  process.exit(1);
});
