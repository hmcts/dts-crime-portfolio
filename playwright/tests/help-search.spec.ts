import { expect, test } from "@playwright/test";

import { installBaselineMocks, signIn } from "../fixtures/sign-in";

/**
 * Help / FAQ search. Asserts the page loads against the live FAQ
 * corpus (file-based, `content/faqs/*.md`) and that the search input
 * narrows the rendered list. The earlier mock-fixture form is gone:
 * since FAQs are no longer stored in Sanity, there is nothing to mock,
 * and asserting against real content guards against drift between
 * fixture and corpus.
 */
test("help page search narrows the FAQ list", async ({ page }) => {
  await installBaselineMocks(page);
  await signIn(page, { next: "/help" });

  // Initial state — a known question from each end of the corpus is
  // visible. The corpus is small enough that picking two stable ones
  // is a reasonable smoke test.
  await expect(page.getByText("What is the portal?")).toBeVisible();
  await expect(
    page.getByText(/What does the Leveson Review mean/i),
  ).toBeVisible();

  // Search for a term that appears in only one FAQ (Leveson). The
  // matching panel stays; the unrelated panel is removed from the DOM
  // (HelpFaq drops sections whose entries are all filtered out while
  // a query is active).
  await page.getByLabel("Search FAQs").fill("Leveson");
  await expect(
    page.getByText(/What does the Leveson Review mean/i),
  ).toBeVisible();
  await expect(page.getByText("What is the portal?")).toHaveCount(0);
});
