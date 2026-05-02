import { expect, test } from "@playwright/test";

import { faqEntries } from "../fixtures/project-fixtures";
import { installBaselineMocks, signIn } from "../fixtures/sign-in";

/**
 * Retro action item 2 — first batch of e2e tests.
 *
 * Covers the brief's test 5: Help / FAQ search. Types into the search
 * box and asserts that matching FAQ entries narrow.
 */
test("help page search narrows the FAQ list", async ({ page }) => {
  await installBaselineMocks(page, [
    { fragment: '_type == "faq"', result: faqEntries },
  ]);
  await signIn(page, { next: "/help" });

  // Initial state — every seeded FAQ question is rendered.
  for (const entry of faqEntries) {
    await expect(page.getByText(entry.question)).toBeVisible();
  }

  // Type a fragment of one specific FAQ ("DPIA") into the search input.
  await page.getByLabel("Search FAQs").fill("DPIA");

  // The matching entry stays visible; non-matching entries are removed
  // from the DOM (HelpFaq drops sections whose entries are all filtered
  // out while a query is active).
  const matching = faqEntries.find((entry) => entry.question.includes("DPIA"))!;
  await expect(page.getByText(matching.question)).toBeVisible();
  for (const entry of faqEntries.filter((e) => !e.question.includes("DPIA"))) {
    await expect(page.getByText(entry.question)).toHaveCount(0);
  }
});
