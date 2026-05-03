CREATE TABLE "prompt_comment_upvotes" (
	"comment_id" text NOT NULL,
	"user_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prompt_comment_upvotes_comment_id_user_email_pk" PRIMARY KEY("comment_id","user_email")
);
--> statement-breakpoint
CREATE TABLE "prompt_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"prompt_id" text NOT NULL,
	"parent_id" text,
	"author_email" text NOT NULL,
	"author_name" text,
	"author_seed" text,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_upvotes" (
	"prompt_id" text NOT NULL,
	"user_email" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prompt_upvotes_prompt_id_user_email_pk" PRIMARY KEY("prompt_id","user_email")
);
--> statement-breakpoint
CREATE TABLE "prompts" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"summary" text,
	"body" text NOT NULL,
	"tool" text NOT NULL,
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"author_email" text,
	"author_name" text,
	"author_seed" text,
	"competition_month" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prompt_comment_upvotes" ADD CONSTRAINT "prompt_comment_upvotes_comment_id_prompt_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."prompt_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_comments" ADD CONSTRAINT "prompt_comments_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_upvotes" ADD CONSTRAINT "prompt_upvotes_prompt_id_prompts_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prompt_comments_prompt_id_idx" ON "prompt_comments" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "prompt_comments_parent_id_idx" ON "prompt_comments" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "prompts_created_at_idx" ON "prompts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "prompts_tool_idx" ON "prompts" USING btree ("tool");