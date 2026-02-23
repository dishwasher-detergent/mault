CREATE TABLE "module_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"module_number" integer NOT NULL,
	"user_id" text DEFAULT auth.user_id() NOT NULL,
	"bottom_closed" integer DEFAULT 102 NOT NULL,
	"bottom_open" integer DEFAULT 307 NOT NULL,
	"paddle_left" integer DEFAULT 102 NOT NULL,
	"paddle_neutral" integer DEFAULT 307 NOT NULL,
	"paddle_right" integer DEFAULT 512 NOT NULL,
	"pusher_left" integer DEFAULT 102 NOT NULL,
	"pusher_neutral" integer DEFAULT 307 NOT NULL,
	"pusher_right" integer DEFAULT 512 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "module_configs_user_module_idx" UNIQUE("user_id","module_number")
);
--> statement-breakpoint
ALTER TABLE "module_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bin_sets" ALTER COLUMN "user_id" SET DEFAULT auth.user_id();--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "module_configs" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "module_configs"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "module_configs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "module_configs"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "module_configs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "module_configs"."user_id")) WITH CHECK ((select auth.user_id() = "module_configs"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "module_configs" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "module_configs"."user_id"));