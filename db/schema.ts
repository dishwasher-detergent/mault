import {
  boolean,
  customType,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
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
    unique("card_image_vectors_scryfall_face_idx").on(table.scryfallId),
  ],
);

export const sortBins = pgTable(
  "sort_bins",
  {
    id: serial().primaryKey(),
    userId: text("user_id").notNull(),
    binNumber: integer("bin_number").notNull(),
    label: text("label").notNull().default(""),
    rules: jsonb("rules").notNull(),
    isCatchAll: boolean("is_catch_all").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("sort_bins_user_bin_idx").on(table.userId, table.binNumber),
  ],
);

export const sortBinPresets = pgTable("sort_bin_presets", {
  id: serial().primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  bins: jsonb("bins").notNull(), // Array of { binNumber, label, rules }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
