CREATE TABLE "card_image_vectors" (
	"id" serial PRIMARY KEY NOT NULL,
	"scryfall_id" text NOT NULL,
	"name" text NOT NULL,
	"set_code" text NOT NULL,
	"embedding" vector(768) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "card_image_vectors_scryfall_face_idx" UNIQUE("scryfall_id")
);
--> statement-breakpoint
CREATE TABLE "sort_bins" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"bin_number" integer NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"rules" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sort_bins_user_bin_idx" UNIQUE("user_id","bin_number")
);
