import { FieldMeta } from "../interfaces/sort-bins.interface";

export const BIN_COUNT = 7;

export const SET_NAME_MAX_LENGTH = 50;
export const CONDITION_STRING_MAX_LENGTH = 200;
export const CONDITION_NUMERIC_MAX = 100_000;

export const FIELD_DEFINITIONS: FieldMeta[] = [
  {
    field: "rarity",
    label: "Rarity",
    type: "enum",
    operators: [
      { value: "in", label: "is any of" },
      { value: "not_in", label: "is none of" },
      { value: "equals", label: "equals" },
      { value: "not_equals", label: "does not equal" },
    ],
    options: [
      { value: "common", label: "Common" },
      { value: "uncommon", label: "Uncommon" },
      { value: "rare", label: "Rare" },
      { value: "mythic", label: "Mythic" },
      { value: "special", label: "Special" },
      { value: "bonus", label: "Bonus" },
    ],
  },
  {
    field: "color_identity",
    label: "Color Identity",
    type: "set",
    operators: [
      { value: "contains_any", label: "contains any of" },
      { value: "contains_all", label: "contains all of" },
      { value: "contains_none", label: "contains none of" },
      { value: "equals", label: "is exactly" },
    ],
    options: [
      { value: "W", label: "White" },
      { value: "U", label: "Blue" },
      { value: "B", label: "Black" },
      { value: "R", label: "Red" },
      { value: "G", label: "Green" },
    ],
  },
  {
    field: "type_line",
    label: "Type Line",
    type: "string",
    operators: [
      { value: "contains", label: "contains" },
      { value: "not_contains", label: "does not contain" },
      { value: "equals", label: "equals" },
      { value: "not_equals", label: "does not equal" },
    ],
  },
  {
    field: "set",
    label: "Set Code",
    type: "string",
    operators: [
      { value: "equals", label: "equals" },
      { value: "not_equals", label: "does not equal" },
      { value: "in", label: "is any of" },
      { value: "not_in", label: "is none of" },
    ],
  },
  {
    field: "price_usd",
    label: "Price (USD)",
    type: "numeric",
    operators: [
      { value: "gt", label: "greater than" },
      { value: "gte", label: "greater than or equal" },
      { value: "lt", label: "less than" },
      { value: "lte", label: "less than or equal" },
      { value: "equals", label: "equals" },
    ],
  },
  {
    field: "cmc",
    label: "Mana Value",
    type: "numeric",
    operators: [
      { value: "equals", label: "equals" },
      { value: "gt", label: "greater than" },
      { value: "gte", label: "greater than or equal" },
      { value: "lt", label: "less than" },
      { value: "lte", label: "less than or equal" },
    ],
  },
  {
    field: "name",
    label: "Name",
    type: "string",
    operators: [
      { value: "contains", label: "contains" },
      { value: "not_contains", label: "does not contain" },
      { value: "equals", label: "equals" },
      { value: "not_equals", label: "does not equal" },
    ],
  },
];
