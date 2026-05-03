import "server-only";

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PortableTextBlock } from "@portabletext/types";

import { FAQ_SECTIONS, type FaqSection } from "./sections";
import type { FaqEntry } from "./types";

const FAQ_DIR = join(process.cwd(), "content", "faqs");

interface ParsedFile {
  frontMatter: Record<string, string>;
  body: string;
}

/**
 * Minimal front-matter parser. The corpus only uses simple `key: value`
 * pairs; if a future FAQ needs lists or nested maps we'll bring in
 * `gray-matter`. Until then, ~30 lines is cheaper than a dependency and
 * easier to reason about for a content surface this small.
 */
function parseFrontMatter(raw: string): ParsedFile {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    throw new Error("FAQ file missing front-matter delimiters (--- ... ---)");
  }
  const [, header, body] = match;
  const frontMatter: Record<string, string> = {};
  for (const line of header.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    frontMatter[key] = value;
  }
  return { frontMatter, body: body.replace(/^\r?\n+/, "").trimEnd() };
}

/**
 * Convert a markdown body into Portable Text blocks. The FAQ corpus is
 * paragraph-only today, so we split on blank lines and emit one `block`
 * per paragraph. If we later need lists or marks we'll graduate to a
 * real markdown parser; the existing `PortableTextRenderer` keeps the
 * downstream rendering identical either way.
 */
function bodyToPortableText(body: string, idPrefix: string): PortableTextBlock[] {
  const paragraphs = body.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean);
  return paragraphs.map((text, index) => {
    const blockKey = `${idPrefix}-b${index}`;
    return {
      _type: "block",
      _key: blockKey,
      style: "normal",
      children: [
        { _type: "span", _key: `${blockKey}-s`, text, marks: [] },
      ],
      markDefs: [],
    } as unknown as PortableTextBlock;
  });
}

function isFaqSection(value: string): value is FaqSection {
  return (FAQ_SECTIONS as readonly string[]).includes(value);
}

function fileToEntry(filename: string, raw: string): FaqEntry {
  const { frontMatter, body } = parseFrontMatter(raw);
  const id = frontMatter.id;
  const section = frontMatter.section;
  const numberRaw = frontMatter.number;
  const question = frontMatter.question;

  if (!id || !section || !numberRaw || !question) {
    throw new Error(
      `FAQ ${filename} is missing one of: id, section, number, question`,
    );
  }
  if (!isFaqSection(section)) {
    throw new Error(
      `FAQ ${filename} declares section "${section}" which is not in FAQ_SECTIONS`,
    );
  }
  const numberValue = Number.parseInt(numberRaw, 10);
  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`FAQ ${filename} has non-positive integer number: ${numberRaw}`);
  }

  return {
    _id: `faq-${id}`,
    section,
    number: numberValue,
    question,
    answer: body ? bodyToPortableText(body, id) : null,
  };
}

/**
 * Load every FAQ from `content/faqs/*.md`, sorted by canonical section
 * order then ascending `number`. Filesystem reads happen on the server
 * only and are cheap enough at this corpus size (~10 docs) that we
 * don't memoise — the help page is `force-dynamic` and editorial
 * content changes via PR + redeploy.
 *
 * Replaces the previous Sanity GROQ query in `lib/help/list.ts`. Spec:
 * openspec/specs/help-faq/spec.md.
 */
export function loadFaqEntries(): FaqEntry[] {
  const files = readdirSync(FAQ_DIR).filter((name) => name.endsWith(".md"));
  const entries = files.map((name) => {
    const raw = readFileSync(join(FAQ_DIR, name), "utf8");
    return fileToEntry(name, raw);
  });

  const sectionIndex = new Map<string, number>(
    FAQ_SECTIONS.map((section, index) => [section, index]),
  );
  return entries.sort((a, b) => {
    const sectionDiff =
      (sectionIndex.get(a.section) ?? 0) - (sectionIndex.get(b.section) ?? 0);
    if (sectionDiff !== 0) return sectionDiff;
    return a.number - b.number;
  });
}
