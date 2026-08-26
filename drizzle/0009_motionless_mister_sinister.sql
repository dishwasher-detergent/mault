CREATE TABLE "impersonation_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"admin_user_id" text NOT NULL,
	"admin_email" text,
	"target_user_id" text NOT NULL,
	"target_email" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"ended_at" timestamp,
	CONSTRAINT "impersonation_audit_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "impersonation_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "impersonation_audit" AS PERMISSIVE FOR SELECT TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "impersonation_audit" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "impersonation_audit" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "impersonation_audit" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);