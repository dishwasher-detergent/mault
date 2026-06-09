import { sql } from "drizzle-orm";
import { authenticatedRole, crudPolicy } from "drizzle-orm/neon/rls";
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

// org_id is a text column referencing neon_auth.organization.id (managed by Neon Auth)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const orgRls = (orgId: any) =>
  sql`${orgId} IN (SELECT "organizationId" FROM neon_auth.member WHERE "userId" = auth.user_id())`;

// ─── Global card vectors (no org scope) ──────────────────────────────────────

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
    crudPolicy({
      role: authenticatedRole,
      read: true,
      modify: false,
    }),
  ],
).enableRLS();

// ─── Org-scoped data tables ───────────────────────────────────────────────────

export const binSets = pgTable(
  "bin_sets",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    orgId: text("org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("bin_sets_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

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
    orgId: text("org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("bins_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const moduleConfigs = pgTable(
  "module_configs",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    moduleNumber: integer("module_number").notNull(),
    orgId: text("org_id").notNull(),
    bottomClosed: integer("bottom_closed").notNull().default(102),
    bottomOpen: integer("bottom_open").notNull().default(307),
    paddleClosed: integer("paddle_closed").notNull().default(150),
    paddleOpen: integer("paddle_open").notNull().default(307),
    pusherLeft: integer("pusher_left").notNull().default(150),
    pusherNeutral: integer("pusher_neutral").notNull().default(307),
    pusherRight: integer("pusher_right").notNull().default(460),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("module_configs_org_module_idx").on(table.orgId, table.moduleNumber),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const feederConfigs = pgTable(
  "feeder_configs",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    orgId: text("org_id").notNull(),
    speed: integer("speed").notNull().default(400),
    duration: integer("duration").notNull().default(3000),
    pulseDuration: integer("pulse_duration").notNull().default(80),
    pauseDuration: integer("pause_duration").notNull().default(50),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("feeder_configs_org_idx").on(table.orgId),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const collections = pgTable(
  "collections",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    name: text("name").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    orgId: text("org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("collections_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const collectionCards = pgTable(
  "collection_cards",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    collectionId: integer("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    scryfallId: text("scryfall_id").notNull(),
    card: jsonb("card").notNull(),
    scannedAt: timestamp("scanned_at").notNull(),
    binNumber: integer("bin_number"),
    capturedImageDataUrl: text("captured_image_data_url"),
    orgId: text("org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("collection_cards_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const notificationSettings = pgTable(
  "notification_settings",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    orgId: text("org_id").notNull(),
    discordWebhookUrl: text("discord_webhook_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("notification_settings_org_idx").on(table.orgId),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const orgSettings = pgTable(
  "org_settings",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    orgId: text("org_id").notNull(),
    primaryColor: text("primary_color"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    unique("org_settings_org_idx").on(table.orgId),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

// ─── Audit tables (org-scoped, no FK — audit records are permanent) ───────────

export const binSetAudit = pgTable(
  "bin_set_audit",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    binSetGuid: text("bin_set_guid").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    orgId: text("org_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("bin_set_audit_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const moduleConfigAudit = pgTable(
  "module_config_audit",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    moduleNumber: integer("module_number").notNull(),
    orgId: text("org_id").notNull(),
    bottomClosed: integer("bottom_closed").notNull(),
    bottomOpen: integer("bottom_open").notNull(),
    paddleClosed: integer("paddle_closed").notNull(),
    paddleOpen: integer("paddle_open").notNull(),
    pusherLeft: integer("pusher_left").notNull(),
    pusherNeutral: integer("pusher_neutral").notNull(),
    pusherRight: integer("pusher_right").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("module_config_audit_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

export const feederConfigAudit = pgTable(
  "feeder_config_audit",
  {
    id: serial().primaryKey(),
    guid: uuid("guid").defaultRandom(),
    orgId: text("org_id").notNull(),
    speed: integer("speed").notNull(),
    duration: integer("duration").notNull(),
    pulseDuration: integer("pulse_duration").notNull(),
    pauseDuration: integer("pause_duration").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    unique("feeder_config_audit_guid_idx").on(table.guid),
    crudPolicy({
      role: authenticatedRole,
      read: orgRls(table.orgId),
      modify: orgRls(table.orgId),
    }),
  ],
).enableRLS();

// ─── Relations ────────────────────────────────────────────────────────────────

export const binSetRelations = relations(binSets, ({ many }) => ({
  bins: many(bins),
}));

export const binRelations = relations(bins, ({ one }) => ({
  binSet: one(binSets, {
    fields: [bins.binSet],
    references: [binSets.id],
  }),
}));

export const collectionRelations = relations(collections, ({ many }) => ({
  cards: many(collectionCards),
}));

export const collectionCardsRelations = relations(collectionCards, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionCards.collectionId],
    references: [collections.id],
  }),
}));
