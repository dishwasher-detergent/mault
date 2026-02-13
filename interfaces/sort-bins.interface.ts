export type ConditionField =
  | "rarity"
  | "color_identity"
  | "type_line"
  | "set"
  | "price_usd"
  | "cmc"
  | "name";

export type ConditionOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "in"
  | "not_in"
  | "contains_any"
  | "contains_all"
  | "contains_none";

export interface BinCondition {
  id: string;
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number | string[];
}

export interface BinRuleGroup {
  id: string;
  combinator: "and" | "or";
  conditions: (BinCondition | BinRuleGroup)[];
}

export interface BinConfig {
  id?: number;
  binNumber: number;
  label: string;
  rules: BinRuleGroup;
}

export interface BinPreset {
  id: number;
  name: string;
  bins: Omit<BinConfig, "id">[];
  createdAt: Date;
  updatedAt: Date;
}

export type FieldType = "string" | "numeric" | "enum" | "set";

export interface FieldMeta {
  field: ConditionField;
  label: string;
  type: FieldType;
  operators: { value: ConditionOperator; label: string }[];
  options?: { value: string; label: string }[];
}

export function isRuleGroup(
  item: BinCondition | BinRuleGroup,
): item is BinRuleGroup {
  return "combinator" in item && "conditions" in item;
}
