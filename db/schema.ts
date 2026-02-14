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
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm/relations";

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

export const cardImageVectors = pgTable(
  "cards",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
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

export const binSets = pgTable(
  "bin_sets",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique("bin_sets_guid_idx").on(table.guid)],
);

export const bins = pgTable(
  "bins",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    rules: jsonb("rules").notNull(),
    isCatchAll: boolean("is_catch_all").notNull().default(false),
    binNumber: integer("bin_number").notNull(),
    binSet: integer("bin_set")
      .notNull()
      .references(() => binSets.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [unique("bins_guid_idx").on(table.guid)],
);

export const binSetRelations = relations(binSets, ({ many }) => ({
  bins: many(bins),
}));

export const binRelations = relations(bins, ({ one }) => ({
  binSet: one(binSets, {
    fields: [bins.binSet],
    references: [binSets.id],
  }),
}));
