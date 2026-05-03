CREATE TABLE "editor_allowlist" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"project_id" text NOT NULL,
	"granted_by" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "editor_allowlist_email_project_unique" ON "editor_allowlist" USING btree ("email","project_id");--> statement-breakpoint
CREATE INDEX "editor_allowlist_email_idx" ON "editor_allowlist" USING btree ("email");