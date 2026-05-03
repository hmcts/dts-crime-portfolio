import { sql } from "drizzle-orm";
import {
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Persistence schema for the prompts surface. Replaces three Sanity
 * documents (`prompt`, `promptUpvote`, `promptComment`) with four
 * Postgres tables. The cutover keeps the public read shape — the GROQ
 * projection's `PromptListItem` — unchanged so consumers don't.
 *
 * Author identity is **denormalised** into rows: prompts and comments
 * carry `author_email`, `author_name`, and an opaque `author_seed`
 * (used as the avatar colour seed). The earlier model resolved name
 * and seed by joining to a `person` Sanity document at query time;
 * with Postgres that join would be a cross-store call, and the
 * editor-of-truth for "what's my display name" is anyway either
 * the email's local part or what the contributor types in. We trade
 * the indirection for simpler reads.
 *
 * Spec: openspec/specs/prompts-library/spec.md.
 */
export const prompts = pgTable(
  "prompts",
  {
    id: text("id").primaryKey(),
    title: text("title").notNull(),
    summary: text("summary"),
    body: text("body").notNull(),
    tool: text("tool").notNull(),
    tags: text("tags")
      .array()
      .notNull()
      .default(sql`ARRAY[]::text[]`),
    authorEmail: text("author_email"),
    authorName: text("author_name"),
    authorSeed: text("author_seed"),
    competitionMonth: text("competition_month"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("prompts_created_at_idx").on(table.createdAt),
    toolIdx: index("prompts_tool_idx").on(table.tool),
  }),
);

/**
 * One row per (prompt, user). Composite primary key keeps the upvote
 * idempotent at the database level: a duplicate insert from the same
 * user simply collides and the toggle endpoint flips between insert
 * and delete.
 */
export const promptUpvotes = pgTable(
  "prompt_upvotes",
  {
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.promptId, table.userEmail] }),
  }),
);

/**
 * Top-level and reply comments live in the same table. `parent_id` is
 * a self-reference; v1 enforces single-level nesting in the API
 * handler (a comment with `parent_id != null` cannot itself be a
 * parent). Spec: openspec/specs/prompts-library/spec.md (Single-level
 * threaded replies).
 */
export const promptComments = pgTable(
  "prompt_comments",
  {
    id: text("id").primaryKey(),
    promptId: text("prompt_id")
      .notNull()
      .references(() => prompts.id, { onDelete: "cascade" }),
    parentId: text("parent_id"),
    authorEmail: text("author_email").notNull(),
    authorName: text("author_name"),
    authorSeed: text("author_seed"),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    promptIdx: index("prompt_comments_prompt_id_idx").on(table.promptId),
    parentIdx: index("prompt_comments_parent_id_idx").on(table.parentId),
  }),
);

/**
 * Per-comment upvote roster. Same composite-PK idempotency posture
 * as `prompt_upvotes`.
 */
export const promptCommentUpvotes = pgTable(
  "prompt_comment_upvotes",
  {
    commentId: text("comment_id")
      .notNull()
      .references(() => promptComments.id, { onDelete: "cascade" }),
    userEmail: text("user_email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.commentId, table.userEmail] }),
  }),
);

/**
 * Per-(email, projectId) editor access. Replaces the Sanity
 * `editorAccess` document for the auth resolver — the Postgres-backed
 * `/admin/editors` admin UI manages rows here, and `resolveUser()`
 * reads them on every request to compute `editableProjects`.
 *
 * `id` is a stable surrogate so the DELETE endpoint can address a
 * single row by id (rather than emailing+projectId in a query string).
 * `email` + `projectId` are uniquely indexed to enforce idempotency at
 * the DB level — a duplicate insert collides cleanly.
 *
 * `grantedBy` records the admin who created the row, recorded for the
 * audit footer on the admin page (Last 5 changes). Spec:
 * openspec/specs/access-control/spec.md (Editor on a specific project)
 * and decisions/2026-05-03-editor-allowlist-claude-design-brief.md.
 */
export const editorAllowlist = pgTable(
  "editor_allowlist",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    projectId: text("project_id").notNull(),
    grantedBy: text("granted_by").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    uq: uniqueIndex("editor_allowlist_email_project_unique").on(
      table.email,
      table.projectId,
    ),
    emailIdx: index("editor_allowlist_email_idx").on(table.email),
  }),
);
