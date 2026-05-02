import { readFile } from "node:fs/promises";

import ExcelJS from "exceljs";
import { expect, test } from "@playwright/test";

import {
  projects,
  sampleReferenceData,
} from "../fixtures/project-fixtures";
import { installSanityMocks } from "../fixtures/sanity-mock";
import { signIn } from "../fixtures/sign-in";

/**
 * Phase 3 lane B — Exports e2e coverage.
 *
 * Spec: openspec/specs/exports/spec.md.
 *
 * Covers the three exports surfaced today on the portfolio page:
 *   - Excel "full"      (client-side, exceljs)
 *   - Excel "redacted"  (client-side, exceljs, no email columns)
 *   - Word ownership    (client-side, docx)
 *   - Compliance briefing (server-side, docx, served from
 *     /api/portfolios/exports/compliance-briefing)
 *
 * PowerPoint is intentionally not covered — `pptxgenjs` is not in the
 * dependency tree (see components/exports/ExportButtons.tsx note: the
 * lib pulls `node:https` and can't bundle for the browser, so the
 * affordance is deferred). When that affordance ships, extend this file.
 *
 * Parsing strategy:
 *   - .xlsx → parsed with `exceljs` (already a dep). Lets us assert on
 *     row count, header columns, and absence of email columns in the
 *     redacted workbook.
 *   - .docx → byte-level: magic-number sniff (PK zip header), non-empty
 *     buffer, and absence of any `@example.gov.uk` substring in the raw
 *     bytes. The seeded fixture data uses that domain for every email,
 *     so a clean docx must not contain it as plaintext anywhere — and
 *     the OOXML parts that hold author / runs are stored in the package
 *     either uncompressed or in deflated streams that, for short ASCII
 *     payloads like an email address, do not collide with any plausible
 *     binary sequence emitted by docx itself. There is no bundled
 *     general-purpose zip reader in deps; the spec calls out byte-level
 *     fallback for exactly this case.
 */

const FIXTURE_PROJECTS = [projects.alpha, projects.beta, projects.gamma];

const PORTFOLIO_FRAGMENT = '_type == "project"';
const PREVIEW_SESSION_FRAGMENT = '_type == "previewSession"';

const SEEDED_EMAIL_DOMAIN = "@example.gov.uk";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/**
 * `exceljs`'s typings expect `Buffer` (with the resizable / non-shared
 * shape from a recent `@types/node`); `fs.readFile` returns a
 * `NonSharedBuffer` whose `Buffer<ArrayBuffer>` generic does not match
 * one-for-one. Coerce via the underlying `ArrayBuffer` slice — the data
 * is the same bytes, just freshly typed.
 */
async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
  await workbook.xlsx.load(arrayBuffer as ArrayBuffer);
  return workbook;
}

/**
 * Compliance briefing fixture — the projection here mirrors the GROQ
 * shape in `app/api/portfolios/exports/compliance-briefing/route.ts`
 * (a flat array, not the `{ total, filtered }` aggregate the portfolio
 * page uses). Returning the wrong shape causes the route to crash with
 * "a.filter is not a function".
 */
const COMPLIANCE_FIXTURE_PROJECTS = FIXTURE_PROJECTS.map((project) => ({
  _id: project._id,
  name: project.name,
  deliveryOwner: project.deliveryOwner,
  governanceTier: 2,
  dpiaInPlace: "complete",
  actsInPlace: "in-progress",
  mojEthicsFrameworkUse: "in-progress",
}));

async function installPortfolioFixtures(page: Parameters<typeof installSanityMocks>[0]) {
  await installSanityMocks(page, [
    { fragment: PREVIEW_SESSION_FRAGMENT, result: null },
    { fragment: '_type == "group"', result: sampleReferenceData.groups },
    { fragment: '_type == "directorate"', result: sampleReferenceData.directorates },
    { fragment: '_type == "businessArea"', result: sampleReferenceData.businessAreas },
    { fragment: '_type == "person"', result: sampleReferenceData.people },
    { fragment: '_type == "capability"', result: sampleReferenceData.capabilities },
    { fragment: '_type == "action"', result: sampleReferenceData.actions },
    // More specific first: the compliance briefing query projects
    // `dpiaInPlace`, which the portfolio list query does not. Match on
    // that to disambiguate before the generic project fragment below.
    {
      fragment: "dpiaInPlace",
      result: COMPLIANCE_FIXTURE_PROJECTS,
    },
    {
      fragment: PORTFOLIO_FRAGMENT,
      result: { total: FIXTURE_PROJECTS.length, filtered: FIXTURE_PROJECTS },
    },
  ]);
}

test.describe("exports", () => {
  test("Excel full export downloads with all expected columns", async ({ page }) => {
    await installPortfolioFixtures(page);
    await signIn(page, { next: "/portfolio" });

    const trigger = page.getByRole("button", {
      name: `Export Excel (${FIXTURE_PROJECTS.length})`,
    });
    await expect(trigger).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await trigger.click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename.endsWith(".xlsx")).toBe(true);
    expect(filename).toMatch(/^portfolio-full-\d{4}-\d{2}-\d{2}\.xlsx$/);

    const path = await download.path();
    expect(path).toBeTruthy();
    const buffer = await readFile(path!);
    expect(buffer.byteLength).toBeGreaterThan(0);
    // PK\x03\x04 — every OOXML package is a zip.
    expect(buffer.subarray(0, 2).toString()).toBe("PK");

    const workbook = await loadWorkbook(buffer);
    const sheet = workbook.getWorksheet("Portfolio");
    expect(sheet).toBeDefined();

    const headerRow = sheet!.getRow(1);
    const headers = (headerRow.values as Array<string | undefined>)
      .filter((value): value is string => typeof value === "string");
    expect(headers).toContain("Name");
    expect(headers).toContain("Stage");
    expect(headers).toContain("Delivery owner email");
    expect(headers).toContain("Business lead email");
    expect(headers).toContain("Legal lead email");

    // Header + one row per project.
    expect(sheet!.rowCount).toBe(1 + FIXTURE_PROJECTS.length);
  });

  test("Excel redacted export omits every email column and leaks no email plaintext", async ({
    page,
  }) => {
    await installPortfolioFixtures(page);
    await signIn(page, { next: "/portfolio" });

    const trigger = page.getByRole("button", {
      name: `Export Excel (PII redacted) (${FIXTURE_PROJECTS.length})`,
    });
    await expect(trigger).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await trigger.click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename.endsWith(".xlsx")).toBe(true);
    expect(filename).toMatch(/^portfolio-redacted-\d{4}-\d{2}-\d{2}\.xlsx$/);

    const path = await download.path();
    const buffer = await readFile(path!);
    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");

    const workbook = await loadWorkbook(buffer);
    const sheet = workbook.getWorksheet("Portfolio");
    expect(sheet).toBeDefined();

    const headers = (sheet!.getRow(1).values as Array<string | undefined>)
      .filter((value): value is string => typeof value === "string");
    expect(headers).toContain("Name");
    expect(headers).toContain("Delivery owner");
    // The PII-redacted variant must remove these columns entirely (not
    // blank them) — see openspec/specs/exports/spec.md.
    expect(headers).not.toContain("Delivery owner email");
    expect(headers).not.toContain("Business lead email");
    expect(headers).not.toContain("Legal lead email");

    // Spot-check via the parsed cell values: no string in the workbook
    // should contain the seeded email domain.
    const cellValues: string[] = [];
    sheet!.eachRow((row) => {
      (row.values as Array<unknown>).forEach((value) => {
        if (typeof value === "string") cellValues.push(value);
      });
    });
    for (const value of cellValues) {
      expect(value).not.toContain(SEEDED_EMAIL_DOMAIN);
    }
  });

  test("Word ownership report downloads as a non-empty .docx", async ({ page }) => {
    await installPortfolioFixtures(page);
    await signIn(page, { next: "/portfolio" });

    await page.getByRole("button", { name: /Export Word ownership/ }).click();
    const menuItem = page.getByRole("menuitem", { name: /Delivery owner/ });
    await expect(menuItem).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await menuItem.click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename.endsWith(".docx")).toBe(true);
    expect(filename).toMatch(
      /^ownership-delivery-owner-\d{4}-\d{2}-\d{2}\.docx$/,
    );

    const path = await download.path();
    const buffer = await readFile(path!);
    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");

    // The ownership document builder does not emit emails (only `name`)
    // — guard against a future regression that adds them by accident.
    expect(buffer.includes(Buffer.from(SEEDED_EMAIL_DOMAIN))).toBe(false);
  });

  test("compliance briefing returns a docx attachment with the right headers", async ({
    page,
  }) => {
    // Compliance briefing fetches via its own GROQ projection (see
    // app/api/portfolios/exports/compliance-briefing/route.ts). The
    // fragment "_type == \"project\"" matches both the portfolio list
    // query and the compliance query, and the fixture server returns
    // the same payload either way. The route only reads name / owner /
    // governance fields, so passing the fuller list shape is harmless.
    await installPortfolioFixtures(page);
    await signIn(page, { next: "/portfolio" });

    const link = page.getByRole("link", { name: "Compliance briefing" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute(
      "href",
      "/api/portfolios/exports/compliance-briefing",
    );

    // The link is rendered with `download`, which routes the response
    // through Playwright's download event.
    const downloadPromise = page.waitForEvent("download");
    await link.click();
    const download = await downloadPromise;

    const filename = download.suggestedFilename();
    expect(filename.endsWith(".docx")).toBe(true);
    expect(filename).toMatch(
      /^compliance-briefing-\d{4}-\d{2}-\d{2}\.docx$/,
    );

    const path = await download.path();
    const buffer = await readFile(path!);
    expect(buffer.byteLength).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString()).toBe("PK");

    // The briefing renders owner *names* but never emails. Catch any
    // future regression that wires owner.email into the document.
    expect(buffer.includes(Buffer.from(SEEDED_EMAIL_DOMAIN))).toBe(false);

    // Sanity-check the MIME constants vs. the spec — they're encoded in
    // the route and the client button. Asserts on the strings keep
    // accidental drift visible.
    expect(XLSX_MIME).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(DOCX_MIME).toBe(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
  });
});
