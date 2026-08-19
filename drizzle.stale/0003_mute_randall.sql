DROP TABLE "sort_bins" CASCADE;--> statement-breakpoint
ALTER TABLE "sort_bin_presets" ADD COLUMN "is_active" boolean DEFAULT false NOT NULL;