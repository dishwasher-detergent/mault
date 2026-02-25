import {
  CONDITION_NUMERIC_MAX,
  CONDITION_STRING_MAX_LENGTH,
  SET_NAME_MAX_LENGTH,
} from "@magic-vault/shared";
import { z } from "zod";

export const createSetSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(SET_NAME_MAX_LENGTH, `Name must be ${SET_NAME_MAX_LENGTH} characters or less`),
});

export type CreateSetFormValues = z.infer<typeof createSetSchema>;

const conditionFieldValues = [
  "rarity",
  "color_identity",
  "type_line",
  "set",
  "price_usd",
  "cmc",
  "name",
] as const;

const conditionOperatorValues = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "not_in",
  "contains_any",
  "contains_all",
  "contains_none",
] as const;

export const binConditionSchema = z.object({
  id: z.string(),
  field: z.enum(conditionFieldValues),
  operator: z.enum(conditionOperatorValues),
  value: z.union([
    z.string().max(CONDITION_STRING_MAX_LENGTH),
    z.number().max(CONDITION_NUMERIC_MAX),
    z.array(z.string().max(CONDITION_STRING_MAX_LENGTH)),
  ]),
});

export const binRuleGroupSchema: z.ZodType<{
  id: string;
  combinator: "and" | "or";
  conditions: (z.infer<typeof binConditionSchema> | { id: string; combinator: "and" | "or"; conditions: unknown[] })[];
}> = z.object({
  id: z.string(),
  combinator: z.enum(["and", "or"]),
  conditions: z.array(
    z.union([binConditionSchema, z.lazy(() => binRuleGroupSchema)]),
  ),
});

export const binConfigSchema = z.object({
  isCatchAll: z.boolean(),
  rules: binRuleGroupSchema,
});

export type BinConfigFormValues = z.infer<typeof binConfigSchema>;
