/**
 * Capture full-page desktop screenshots of every authenticated surface
 * so they can be dragged into Claude Design (https://claude.ai/design)
 * for visual iteration.
 *
 * Usage:
 *   1. Start a server the script can sign in against. Two options:
 *
 *      Local dev (fastest):
 *        export PREVIEW_AUTH_COOKIE_SECRET=$(openssl rand -hex 32)
 *        export ADMIN_ALLOWLIST=tester@hmcts.net
 *        export DATABASE_URL=postgres://crime:crime@localhost:5432/crime
 *        export NEXT_PUBLIC_SANITY_PROJECT_ID=…  NEXT_PUBLIC_SANITY_DATASET=…
 *        export SANITY_API_TOKEN=…   # optional but content surfaces will be empty
 *        pnpm dev
 *        # then in another shell:
 *        pnpm screenshots
 *
 *      Render preview:
 *        BASE_URL=https://<your-render-host> SIGN_IN_EMAIL=tester@hmcts.net pnpm screenshots
 *
 *   2. PNGs land in `OUTPUT_DIR` (defaults to
 *      `../artefacts/screenshots/<YYYY-MM-DD>/` so they sit alongside
 *      the existing `artefacts/` folder, not inside the git repo).
 *
 *   3. Drag each PNG into a fresh Claude Design document with the brief
 *      template at the bottom of this file. One document per surface.
 *
 * Env vars:
 *   BASE_URL        — http://localhost:3000 by default
 *   SIGN_IN_EMAIL   — tester@hmcts.net by default
 *   ADMIN_EMAIL     — when set, also captures admin-only surfaces using
 *                     this email (must be on ADMIN_ALLOWLIST on the
 *                     target server)
 *   OUTPUT_DIR      — override the screenshot output directory
 *   VIEWPORT_W      — desktop width, default 1440
 *   VIEWPORT_H      — desktop height, default 900
 */

import { chromium, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

interface Surface {
  /** URL path. Use a real demo id for dynamic routes. */
  route: string;
  /** Filename stem (no extension). */
  name: string;
  /** When true, sign-in is required as ADMIN_EMAIL. */
  adminOnly?: boolean;
  /** Skip if the route hard-redirects (e.g., to /preview-auth) — set
   *  routes that shouldn't be captured as a "post-auth" surface here. */
  skipIfRedirect?: boolean;
}

const SURFACES: Surface[] = [
  { route: "/portfolio", name: "portfolio" },
  // The dossier requires a real id; demo-project-bundle-triage is
  // minted by scripts/seed-demo.ts. Swap to any other demo project id
  // if your seed has changed.
  { route: "/portfolio/demo-project-bundle-triage", name: "portfolio-dossier" },
  { route: "/portfolio/submit", name: "portfolio-submit" },
  { route: "/action-plan", name: "action-plan" },
  { route: "/events", name: "events" },
  { route: "/learning", name: "learning" },
  { route: "/prompts", name: "prompts" },
  { route: "/profile", name: "profile" },
  { route: "/help", name: "help" },
  { route: "/compare", name: "compare" },
  { route: "/admin/editors", name: "admin-editors", adminOnly: true },
];

const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const SIGN_IN_EMAIL = process.env.SIGN_IN_EMAIL ?? "tester@hmcts.net";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? null;
const VIEWPORT_W = Number(process.env.VIEWPORT_W ?? 1440);
const VIEWPORT_H = Number(process.env.VIEWPORT_H ?? 900);

async function ensureOutputDir(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  const fallback = resolve(__dirname, "..", "..", "artefacts", "screenshots", today);
  const target = resolve(process.env.OUTPUT_DIR ?? fallback);
  await mkdir(target, { recursive: true });
  return target;
}

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto(`${BASE_URL}/preview-auth?next=/portfolio`, { timeout: 15_000 });
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForURL((url) => url.pathname.startsWith("/portfolio"), {
    timeout: 15_000,
  });
}

async function captureSurfaces(
  context: BrowserContext,
  surfaces: Surface[],
  outputDir: string,
): Promise<{ saved: number; failed: number }> {
  const page = await context.newPage();
  let saved = 0;
  let failed = 0;
  for (const surface of surfaces) {
    const file = join(outputDir, `${surface.name}.png`);
    try {
      const response = await page.goto(`${BASE_URL}${surface.route}`, {
        waitUntil: "networkidle",
        timeout: 20_000,
      });
      // Networkidle is sometimes flaky on Next.js — give late-mounting
      // client components a beat to render before the snap.
      await page.waitForTimeout(750);
      await page.screenshot({ path: file, fullPage: true });
      const status = response?.status() ?? 0;
      console.log(`  ✓ ${surface.route} (${status}) → ${file}`);
      saved += 1;
    } catch (error) {
      console.warn(`  ✗ ${surface.route} failed: ${(error as Error).message}`);
      failed += 1;
    }
  }
  await page.close();
  return { saved, failed };
}

async function main(): Promise<void> {
  const outputDir = await ensureOutputDir();
  console.log(`Saving to ${outputDir}`);
  console.log(`Driving browser against ${BASE_URL}`);
  console.log(`Viewport ${VIEWPORT_W}x${VIEWPORT_H}`);

  let browser: Browser | undefined;
  try {
    browser = await chromium.launch();
  } catch (error) {
    console.error(
      "Failed to launch chromium. Run `pnpm exec playwright install chromium` once " +
        "to download the browser binary, then retry.",
    );
    throw error;
  }

  try {
    // Pass 1 — non-admin user. Captures everything except admin-only
    // surfaces. Admin pages will produce a "forbidden" panel here,
    // which is also useful for the design loop.
    const ctx = await browser.newContext({
      viewport: { width: VIEWPORT_W, height: VIEWPORT_H },
    });
    try {
      await signIn(ctx.pages()[0] ?? (await ctx.newPage()), SIGN_IN_EMAIL);
    } catch (error) {
      console.error(
        `Sign-in failed at ${BASE_URL}/preview-auth — is the dev server up? ` +
          `(${(error as Error).message})`,
      );
      throw error;
    }
    const nonAdminSurfaces = SURFACES.filter((s) => !s.adminOnly);
    console.log(`\nCapturing ${nonAdminSurfaces.length} surfaces as ${SIGN_IN_EMAIL}…`);
    const pass1 = await captureSurfaces(ctx, nonAdminSurfaces, outputDir);
    await ctx.close();

    // Pass 2 — admin user (optional). Only runs when ADMIN_EMAIL is set
    // and on the ADMIN_ALLOWLIST of the target server.
    let pass2 = { saved: 0, failed: 0 };
    if (ADMIN_EMAIL) {
      const adminCtx = await browser.newContext({
        viewport: { width: VIEWPORT_W, height: VIEWPORT_H },
      });
      try {
        await signIn(
          adminCtx.pages()[0] ?? (await adminCtx.newPage()),
          ADMIN_EMAIL,
        );
        const adminSurfaces = SURFACES.filter((s) => s.adminOnly);
        console.log(`\nCapturing ${adminSurfaces.length} admin surfaces as ${ADMIN_EMAIL}…`);
        pass2 = await captureSurfaces(adminCtx, adminSurfaces, outputDir);
      } finally {
        await adminCtx.close();
      }
    } else {
      console.log("\nADMIN_EMAIL not set — skipping admin-only surfaces.");
    }

    const totalSaved = pass1.saved + pass2.saved;
    const totalFailed = pass1.failed + pass2.failed;
    console.log(`\nDone. ${totalSaved} saved, ${totalFailed} failed.`);
    if (totalFailed > 0) process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/*
 * --- Brief template per surface (paste into Claude Design alongside the PNG) ---
 *
 *   Recreate this surface in Claude Design so I can iterate on it.
 *   Match the layout, content, and components in the screenshot.
 *   This is the [Portfolio | Action Plan | Project dossier | …] page of
 *   an internal HMCTS staff tool.
 *
 *   Components I'll want to edit independently:
 *     - <PageHeader />
 *     - <FilterRow />
 *     - <ProjectCard />
 *     - <ExportMenu />
 *
 *   Use Tailwind utility classes. GOV.UK-flavoured palette but not strict.
 *   Keep all the seed copy you can read in the screenshot — don't replace
 *   it with lorem ipsum, I'll edit live in the canvas.
 *
 *   Out of scope: mobile layout, light/dark mode, auth gating UI.
 */
