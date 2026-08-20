ALTER TABLE "cards" RENAME COLUMN "scryfall_id" TO "card_id";--> statement-breakpoint
ALTER TABLE "collection_cards" RENAME COLUMN "scryfall_id" TO "card_id";--> statement-breakpoint
ALTER TABLE "cards" DROP CONSTRAINT "cards_game_lang_card_idx";--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_game_lang_card_idx" UNIQUE("game_key","lang","card_id");