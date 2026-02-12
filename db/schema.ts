import {
	customType,
	pgTable,
	serial,
	text,
	timestamp,
	unique
} from "drizzle-orm/pg-core";

const vector = customType<{ data: number[]; driverData: string }>({
	dataType() {
		return "vector(768)"; // 768 dimensions — SigLIP ViT-Base-Patch16-224 embeddings
	},
	toDriver(value: number[]): string {
		return JSON.stringify(value);
	},
	fromDriver(value: string): number[] {
		return JSON.parse(value);
	},
});

// Table for storing card image vectors
export const cardImageVectors = pgTable(
	"card_image_vectors",
	{
		id: serial().primaryKey(),
		scryfallId: text("scryfall_id").notNull(),
		name: text("name").notNull(),
		setCode: text("set_code").notNull(),
		embedding: vector("embedding").notNull(),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at").defaultNow().notNull(),
	},
	(table) => [
		unique("card_image_vectors_scryfall_face_idx").on(
			table.scryfallId,
		),
	],
);
