CREATE TABLE "bin_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"name" text NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bins" (
	"id" serial PRIMARY KEY NOT NULL,
	"guid" uuid DEFAULT gen_random_uuid(),
	"rules" jsonb NOT NULL,
	"is_catch_all" boolean DEFAULT false NOT NULL,
	"bin_number" integer NOT NULL,
	"bin_set" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "sort_bin_presets" CASCADE;--> statement-breakpoint
ALTER TABLE "card_image_vectors" RENAME TO "cards";--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "guid" uuid DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "bins" ADD CONSTRAINT "bins_bin_set_bin_sets_id_fk" FOREIGN KEY ("bin_set") REFERENCES "public"."bin_sets"("id") ON DELETE no action ON UPDATE no action;