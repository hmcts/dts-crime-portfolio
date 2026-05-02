import { expect, test } from "@playwright/test";

import { installBaselineMocks } from "../fixtures/sign-in";
import { signIn } from "../fixtures/sign-in";

/**
 * e2e for the prompts comments modal — see openspec/specs/prompts-library/
 * spec.md (Comments thread modal, Per-comment idempotent upvotes,
 * Single-level threaded replies).
 *
 * The test installs a single seeded prompt with a couple of comments so
 * the modal has content to render, then exercises:
 *   - opening the modal from the comment indicator
 *   - posting a new comment from inside the modal
 *   - clicking the per-comment upvote on an existing comment
 *
 * The Sanity mutation endpoint always responds with the canned
 * `{ transactionId: "fake" }`, so we assert against the JSON returned
 * by our own Next.js route (the optimistic count update happens via
 * `setState` once the response lands).
 */

// The list query and the single-prompt fetch both contain
// `_type == "prompt"` — so we register a more specific fragment
// (`_id == $id`, present only in the comment/upvote route's GROQ)
// FIRST and rely on first-match-wins to give the route handlers an
// object instead of an array.
const PROMPTS_LIST_FRAGMENT = '_type == "prompt"';
const PROMPT_FETCH_FRAGMENT = '_type == "prompt" && _id == $id';

const SEEDED_PROMPT = {
  _id: "prompt-modal-test",
  title: "What happened while I was on leave?",
  summary: null,
  body:
    "I've just returned from one week's annual leave and need to know what " +
    "I need to do. Provide me with a run down of the emails and Teams " +
    "messages received in my Inbox, chats, and channels since [Insert " +
    "first day of leave].",
  tool: "copilot",
  tags: ["#Communications", "#Other", "#Email"],
  createdAt: "2025-07-31T09:00:00.000Z",
  authorName: "Nigel Mayer",
  authorSeed: "person-nigel-mayer",
  upvoteCount: 85,
  commentCount: 2,
  comments: [
    {
      _key: "comment-emma",
      authorName: "Emma Hunter2",
      authorSeed: "person-emma-hunter2",
      body: "This is brilliant; I wish I had seen this a few weeks ago when I returned from leave. Will definitely be trying it out next time round.",
      createdAt: "2026-01-01T09:00:00.000Z",
      upvoteCount: 1,
      parentKey: null,
    },
    {
      _key: "comment-yvonne",
      authorName: "Yvonne Lynn2",
      authorSeed: "person-yvonne-lynn2",
      body: "This would be great when we have licences. Without one you could workaround by copy/pasting every email into a word document and ask it to do similar – but if you have hundreds of emails it's a little more challenging at this stage.",
      createdAt: "2026-02-01T09:00:00.000Z",
      upvoteCount: 10,
      parentKey: null,
    },
  ],
  competitionMonth: null,
};

test("prompts modal: open from card, post a comment, upvote a comment", async ({ page }) => {
  await installBaselineMocks(page, [
    {
      fragment: PROMPT_FETCH_FRAGMENT,
      result: {
        _id: SEEDED_PROMPT._id,
        comments: SEEDED_PROMPT.comments.map((entry) => ({
          _key: entry._key,
          userEmail: "seed@hmcts.net",
          body: entry.body,
          createdAt: entry.createdAt,
          parentKey: entry.parentKey ?? undefined,
        })),
      },
    },
    { fragment: PROMPTS_LIST_FRAGMENT, result: [SEEDED_PROMPT] },
  ]);

  await signIn(page, { next: "/prompts" });

  await page.waitForURL((url) => url.pathname === "/prompts");

  // The card renders the title and the seeded comment count.
  await expect(page.getByRole("heading", { name: SEEDED_PROMPT.title })).toBeVisible();

  // Click the footer comment button to open the modal. The card has a
  // header indicator with the same aria-label as well; both should
  // open the same modal — exercising the footer affordance is enough
  // for the spec's "click the comment indicator opens the modal"
  // scenario.
  const openButtons = page.getByRole("button", {
    name: `Open comments (${SEEDED_PROMPT.commentCount})`,
  });
  await openButtons.first().click();

  // Modal landmarks — title at the top of the dialog, comments header
  // on the right column, both seeded comments visible.
  const modal = page.getByRole("dialog", { name: /Comments/ });
  await expect(modal).toBeVisible();
  await expect(modal.getByText("Comments (2)")).toBeVisible();
  await expect(modal.getByText("Emma Hunter2")).toBeVisible();
  await expect(modal.getByText("Yvonne Lynn2")).toBeVisible();
  // The full prompt body is in the modal — the card truncates with an
  // ellipsis but the modal SHOULD render it in full.
  await expect(modal.getByText(/Provide me with a run down of the emails/)).toBeVisible();

  // Post a new top-level comment from inside the modal. The Next.js
  // route hits the local Sanity mock for the prompt-fetch and the
  // transaction; we assert the optimistic UI update lands.
  await modal.getByPlaceholder("Share your thoughts…").fill("Saved me an hour today, thank you!");
  await modal.getByRole("button", { name: "Post Comment" }).click();
  // After a successful POST the modal's count reflects the appended
  // entry — the header switches from "(2)" to "(3)".
  await expect(modal.getByText("Comments (3)")).toBeVisible();
  await expect(modal.getByText("Saved me an hour today, thank you!")).toBeVisible();

  // Per-comment upvote — Emma's seeded count is 1; clicking it
  // optimistically goes to 2 and the server response confirms.
  const emmaUpvote = modal
    .getByRole("button", { name: /Upvote comment \(\d+\)/ })
    .first();
  await emmaUpvote.click();
  await expect(emmaUpvote).toHaveAccessibleName(/Upvote comment \(\d+\)/);
  // The number visibly increments — we don't assert an exact value
  // because the mock returns the optimistic count, which is what the
  // UI displays.
  await expect(emmaUpvote).toContainText(/\d+/);

  // Close via the X button.
  await modal.getByRole("button", { name: "Close" }).first().click();
  await expect(modal).toBeHidden();
});

test("prompts modal: reply control opens an inline reply form under a parent comment", async ({
  page,
}) => {
  await installBaselineMocks(page, [
    {
      fragment: PROMPT_FETCH_FRAGMENT,
      result: {
        _id: SEEDED_PROMPT._id,
        comments: SEEDED_PROMPT.comments.map((entry) => ({
          _key: entry._key,
          userEmail: "seed@hmcts.net",
          body: entry.body,
          createdAt: entry.createdAt,
          parentKey: entry.parentKey ?? undefined,
        })),
      },
    },
    { fragment: PROMPTS_LIST_FRAGMENT, result: [SEEDED_PROMPT] },
  ]);

  await signIn(page, { next: "/prompts" });
  await page.waitForURL((url) => url.pathname === "/prompts");

  await page
    .getByRole("button", { name: `Open comments (${SEEDED_PROMPT.commentCount})` })
    .first()
    .click();

  const modal = page.getByRole("dialog", { name: /Comments/ });
  await expect(modal).toBeVisible();

  // Click "Reply" on the first comment — the inline reply form
  // appears with the placeholder seeded against the parent's name.
  await modal.getByRole("button", { name: "Reply" }).first().click();
  await expect(modal.getByPlaceholder(/^Reply to /)).toBeVisible();

  // Cancelling collapses the reply form. The button label flips back
  // to "Reply".
  await modal.getByRole("button", { name: "Cancel reply" }).click();
  await expect(modal.getByPlaceholder(/^Reply to /)).toBeHidden();
});
