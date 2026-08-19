ALTER TABLE "bin_sets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bin_sets" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "bins" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "bin_sets" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "bin_sets"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "bin_sets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "bin_sets"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "bin_sets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "bin_sets"."user_id")) WITH CHECK ((select auth.user_id() = "bin_sets"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "bin_sets" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "bin_sets"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "bins" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.user_id() = "bins"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "bins" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select auth.user_id() = "bins"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "bins" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select auth.user_id() = "bins"."user_id")) WITH CHECK ((select auth.user_id() = "bins"."user_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "bins" AS PERMISSIVE FOR DELETE TO "authenticated" USING ((select auth.user_id() = "bins"."user_id"));