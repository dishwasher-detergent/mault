CREATE TABLE "bin_route_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"bin_number" integer NOT NULL,
	"module" integer NOT NULL,
	"direction" text NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bin_route_audit_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "bin_route_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bin_routes" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"bin_number" integer NOT NULL,
	"module" integer NOT NULL,
	"direction" text NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bin_routes_org_bin_idx" UNIQUE("org_id","bin_number")
);
--> statement-breakpoint
ALTER TABLE "bin_routes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bin_set_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"bin_set_guid" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bin_set_audit_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "bin_set_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bin_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"game_id" integer,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bin_sets_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "bin_sets" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bins" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"rules" jsonb NOT NULL,
	"is_catch_all" boolean DEFAULT false NOT NULL,
	"bin_number" integer NOT NULL,
	"bin_set" integer NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bins_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "bins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"scryfall_id" text NOT NULL,
	"game_key" text DEFAULT 'mtg' NOT NULL,
	"lang" text DEFAULT 'en' NOT NULL,
	"name" text NOT NULL,
	"set_code" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "cards_game_lang_card_idx" UNIQUE("game_key","lang","scryfall_id")
);
--> statement-breakpoint
ALTER TABLE "cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "collection_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"collection_id" integer NOT NULL,
	"scryfall_id" text NOT NULL,
	"card" jsonb NOT NULL,
	"scanned_at" timestamp NOT NULL,
	"bin_number" integer,
	"captured_image_data_url" text,
	"is_foil" boolean DEFAULT false NOT NULL,
	"is_downloaded" boolean DEFAULT false NOT NULL,
	"alternative_matches" jsonb,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collection_cards_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "collection_cards" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "collections" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"game_id" integer,
	"lang" text DEFAULT 'en' NOT NULL,
	"org_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "collections_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "feeder_config_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"org_id" text NOT NULL,
	"speed" integer NOT NULL,
	"duration" integer NOT NULL,
	"pulse_duration" integer NOT NULL,
	"pause_duration" integer NOT NULL,
	"settle_duration" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feeder_config_audit_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "feeder_config_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "feeder_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"org_id" text NOT NULL,
	"speed" integer DEFAULT 400 NOT NULL,
	"duration" integer DEFAULT 3000 NOT NULL,
	"pulse_duration" integer DEFAULT 80 NOT NULL,
	"pause_duration" integer DEFAULT 50 NOT NULL,
	"settle_duration" integer DEFAULT 150 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "feeder_configs_org_idx" UNIQUE("org_id")
);
--> statement-breakpoint
ALTER TABLE "feeder_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "games" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"key" text NOT NULL,
	"name" text NOT NULL,
	"data_source_url" text NOT NULL,
	"field_definitions" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "games_key_idx" UNIQUE("key"),
	CONSTRAINT "games_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "games" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "module_config_audit" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"module_number" integer NOT NULL,
	"org_id" text NOT NULL,
	"bottom_closed" integer NOT NULL,
	"bottom_open" integer NOT NULL,
	"paddle_closed" integer NOT NULL,
	"paddle_open" integer NOT NULL,
	"pusher_left" integer NOT NULL,
	"pusher_neutral" integer NOT NULL,
	"pusher_right" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "module_config_audit_guid_idx" UNIQUE("guid")
);
--> statement-breakpoint
ALTER TABLE "module_config_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "module_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"module_number" integer NOT NULL,
	"org_id" text NOT NULL,
	"bottom_closed" integer DEFAULT 102 NOT NULL,
	"bottom_open" integer DEFAULT 307 NOT NULL,
	"paddle_closed" integer DEFAULT 150 NOT NULL,
	"paddle_open" integer DEFAULT 307 NOT NULL,
	"pusher_left" integer DEFAULT 150 NOT NULL,
	"pusher_neutral" integer DEFAULT 307 NOT NULL,
	"pusher_right" integer DEFAULT 460 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "module_configs_org_module_idx" UNIQUE("org_id","module_number")
);
--> statement-breakpoint
ALTER TABLE "module_configs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"org_id" text NOT NULL,
	"discord_webhook_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_settings_org_idx" UNIQUE("org_id")
);
--> statement-breakpoint
ALTER TABLE "notification_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "org_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"org_id" text NOT NULL,
	"primary_color" text,
	"scanner_layout" text,
	"discord_webhook_url" text,
	"discord_notify_on_scan" boolean DEFAULT false NOT NULL,
	"scan_coverage" integer,
	"scan_offset_x" integer,
	"scan_offset_y" integer,
	"capture_settle_delay_ms" integer,
	"module_count" integer DEFAULT 3 NOT NULL,
	"channel_layout" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "org_settings_org_idx" UNIQUE("org_id")
);
--> statement-breakpoint
ALTER TABLE "org_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "bin_sets" ADD CONSTRAINT "bin_sets_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bins" ADD CONSTRAINT "bins_bin_set_bin_sets_id_fk" FOREIGN KEY ("bin_set") REFERENCES "public"."bin_sets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_cards" ADD CONSTRAINT "collection_cards_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_game_id_games_id_fk" FOREIGN KEY ("game_id") REFERENCES "public"."games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "bin_route_audit" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("bin_route_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_route_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "bin_route_audit" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("bin_route_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_route_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "bin_route_audit" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("bin_route_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_route_audit"."org_id")) WITH CHECK (("bin_route_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_route_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "bin_route_audit" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("bin_route_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_route_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "bin_routes" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("bin_routes"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_routes"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "bin_routes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("bin_routes"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_routes"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "bin_routes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("bin_routes"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_routes"."org_id")) WITH CHECK (("bin_routes"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_routes"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "bin_routes" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("bin_routes"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_routes"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "bin_set_audit" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("bin_set_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_set_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "bin_set_audit" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("bin_set_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_set_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "bin_set_audit" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("bin_set_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_set_audit"."org_id")) WITH CHECK (("bin_set_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_set_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "bin_set_audit" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("bin_set_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_set_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "bin_sets" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("bin_sets"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_sets"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "bin_sets" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("bin_sets"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_sets"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "bin_sets" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("bin_sets"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_sets"."org_id")) WITH CHECK (("bin_sets"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_sets"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "bin_sets" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("bin_sets"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bin_sets"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "bins" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("bins"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bins"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "bins" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("bins"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bins"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "bins" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("bins"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bins"."org_id")) WITH CHECK (("bins"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bins"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "bins" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("bins"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("bins"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "cards" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "cards" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "cards" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "cards" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "collection_cards" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("collection_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("collection_cards"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "collection_cards" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("collection_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("collection_cards"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "collection_cards" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("collection_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("collection_cards"."org_id")) WITH CHECK (("collection_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("collection_cards"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "collection_cards" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("collection_cards"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("collection_cards"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "collections" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("collections"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("collections"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "collections" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("collections"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("collections"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "collections" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("collections"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("collections"."org_id")) WITH CHECK (("collections"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("collections"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "collections" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("collections"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("collections"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "feeder_config_audit" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("feeder_config_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("feeder_config_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "feeder_config_audit" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("feeder_config_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("feeder_config_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "feeder_config_audit" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("feeder_config_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("feeder_config_audit"."org_id")) WITH CHECK (("feeder_config_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("feeder_config_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "feeder_config_audit" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("feeder_config_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("feeder_config_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "feeder_configs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("feeder_configs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("feeder_configs"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "feeder_configs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("feeder_configs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("feeder_configs"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "feeder_configs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("feeder_configs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("feeder_configs"."org_id")) WITH CHECK (("feeder_configs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("feeder_configs"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "feeder_configs" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("feeder_configs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("feeder_configs"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "games" AS PERMISSIVE FOR SELECT TO "authenticated" USING (true);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "games" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "games" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (false) WITH CHECK (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "games" AS PERMISSIVE FOR DELETE TO "authenticated" USING (false);--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "module_config_audit" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("module_config_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("module_config_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "module_config_audit" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("module_config_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("module_config_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "module_config_audit" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("module_config_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("module_config_audit"."org_id")) WITH CHECK (("module_config_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("module_config_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "module_config_audit" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("module_config_audit"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("module_config_audit"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "module_configs" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("module_configs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("module_configs"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "module_configs" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("module_configs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("module_configs"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "module_configs" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("module_configs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("module_configs"."org_id")) WITH CHECK (("module_configs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("module_configs"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "module_configs" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("module_configs"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("module_configs"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "notification_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("notification_settings"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("notification_settings"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "notification_settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("notification_settings"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("notification_settings"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "notification_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("notification_settings"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("notification_settings"."org_id")) WITH CHECK (("notification_settings"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("notification_settings"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "notification_settings" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("notification_settings"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("notification_settings"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-select" ON "org_settings" AS PERMISSIVE FOR SELECT TO "authenticated" USING (("org_settings"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_settings"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-insert" ON "org_settings" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK (("org_settings"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_settings"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-update" ON "org_settings" AS PERMISSIVE FOR UPDATE TO "authenticated" USING (("org_settings"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_settings"."org_id")) WITH CHECK (("org_settings"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_settings"."org_id"));--> statement-breakpoint
CREATE POLICY "crud-authenticated-policy-delete" ON "org_settings" AS PERMISSIVE FOR DELETE TO "authenticated" USING (("org_settings"."org_id" = (current_setting('request.jwt.claims', true)::json ->> 'org_id')) AND auth_is_org_member("org_settings"."org_id"));