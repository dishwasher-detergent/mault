DROP POLICY "crud-authenticated-policy-select" ON "notification_settings" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-insert" ON "notification_settings" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-update" ON "notification_settings" CASCADE;--> statement-breakpoint
DROP POLICY "crud-authenticated-policy-delete" ON "notification_settings" CASCADE;--> statement-breakpoint
DROP TABLE "notification_settings" CASCADE;--> statement-breakpoint
ALTER TABLE "org_settings" DROP COLUMN "discord_webhook_url";