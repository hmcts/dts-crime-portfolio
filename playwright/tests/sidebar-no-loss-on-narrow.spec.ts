import { expect, test } from "@playwright/test";

import { installBaselineMocks, signIn } from "../fixtures/sign-in";

/**
 * Explicit regression for PM defect 2: "the site seems responsive but
 * when the browser is very small the side bar is lost."
 *
 * Pre-fix the sidebar uses `hidden md:block`, so below 768px it is
 * removed from the DOM with no entry-point. At 320x600 — narrower
 * than any phone we care about, but a useful "extreme narrow" floor —
 * the sidebar must still be reachable from the hamburger and a nav
 * link must be clickable from inside it.
 */
test.describe("sidebar reachability at extreme-narrow widths", () => {
  test.use({ viewport: { width: 320, height: 600 } });

  test("hamburger remains the entry-point; opening the drawer reveals clickable nav links", async ({
    page,
  }) => {
    await installBaselineMocks(page, [
      { fragment: '_type == "project"', result: { total: 0, filtered: [] } },
    ]);

    await signIn(page);
    await expect(page).toHaveURL(/\/portfolio$/);

    // Defect-2 anchor: the hamburger toggle MUST be visible at this
    // width. If the sidebar regresses to `hidden md:block` with no
    // toggle, this assertion catches it because the toggle would
    // either be unrendered or hidden.
    const toggle = page.getByTestId("sidebar-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    // Main content is the page the user landed on — visible with the
    // sidebar closed (the fix must not make the sidebar permanently
    // overlay the content).
    await expect(page.getByRole("main")).toBeVisible();

    // Open the drawer.
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");

    const sidebar = page.locator("#primary-sidebar");
    await expect(sidebar).toBeVisible();

    // A primary nav link inside the sidebar is clickable. We use the
    // "Help" link because /help renders a deterministic h1 we can
    // assert on, and because Help is on the path of every persona's
    // first session — a click that fails here is exactly the
    // user-visible regression the PM reported.
    await sidebar.getByRole("link", { name: "Help" }).click();
    await expect(page).toHaveURL(/\/help$/);
    await expect(page.getByRole("heading", { name: "Help", level: 1 })).toBeVisible();

    // After navigation the drawer auto-closes (standard mobile UX);
    // verify the main content is visible again.
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("main")).toBeVisible();
  });
});
