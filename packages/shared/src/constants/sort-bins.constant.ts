import type {
  BinCondition,
  BinRuleGroup,
} from "../interfaces/sort-bins.interface";
import { FieldMeta } from "../interfaces/sort-bins.interface";

export const SET_NAME_MAX_LENGTH = 50;
export const CONDITION_STRING_MAX_LENGTH = 200;
export const CONDITION_NUMERIC_MAX = 100_000;

export const FIELD_DEFINITIONS: FieldMeta[] = [
  {
    field: "rarity",
    label: "Rarity",
    type: "enum",
    path: "rarity",
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
    path: "colorIdentity",
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
    path: "typeLine",
    operators: [
      { value: "contains", label: "contains" },
      { value: "not_contains", label: "does not contain" },
      { value: "starts_with", label: "starts with" },
      { value: "ends_with", label: "ends with" },
      { value: "equals", label: "equals" },
      { value: "not_equals", label: "does not equal" },
    ],
  },
  {
    field: "set",
    label: "Set Code",
    type: "string",
    path: "set",
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
    path: "price",
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
    path: "cmc",
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
    path: "name",
    operators: [
      { value: "contains", label: "contains" },
      { value: "not_contains", label: "does not contain" },
      { value: "starts_with", label: "starts with" },
      { value: "ends_with", label: "ends with" },
      { value: "equals", label: "equals" },
      { value: "not_equals", label: "does not equal" },
    ],
  },
  {
    field: "description",
    label: "Description",
    type: "string",
    path: "text",
    operators: [
      { value: "contains", label: "contains" },
      { value: "not_contains", label: "does not contain" },
      { value: "starts_with", label: "starts with" },
      { value: "ends_with", label: "ends with" },
      { value: "equals", label: "equals" },
      { value: "not_equals", label: "does not equal" },
    ],
  },
];

export type DefaultBinInit = {
  binNumber: number;
  rules: BinRuleGroup;
  isCatchAll: boolean;
};

const COLOR_BINS: Array<{ binNumber: number; colors: string[] }> = [
  { binNumber: 1, colors: ["W"] },
  { binNumber: 2, colors: ["U"] },
  { binNumber: 3, colors: ["B"] },
  { binNumber: 4, colors: ["R"] },
  { binNumber: 5, colors: ["G"] },
  { binNumber: 6, colors: [] },
];

export function createDefaultColorBins(binCount: number): DefaultBinInit[] {
  if (binCount !== 7) return createDefaultCatchAllOnlyBins(binCount);

  return [
    ...COLOR_BINS.map(({ binNumber, colors }) => ({
      binNumber,
      isCatchAll: false,
      rules: {
        id: crypto.randomUUID(),
        combinator: "and" as const,
        conditions: [
          {
            id: crypto.randomUUID(),
            field: "color_identity",
            operator: "equals",
            value: colors,
          } satisfies BinCondition,
        ],
      } satisfies BinRuleGroup,
    })),
    {
      binNumber: 7,
      isCatchAll: true,
      rules: {
        id: crypto.randomUUID(),
        combinator: "and" as const,
        conditions: [],
      } satisfies BinRuleGroup,
    },
  ];
}

export function createDefaultCatchAllOnlyBins(
  binCount: number,
): DefaultBinInit[] {
  return Array.from({ length: binCount }, (_, i) => ({
    binNumber: i + 1,
    isCatchAll: i === binCount - 1,
    rules: {
      id: crypto.randomUUID(),
      combinator: "and" as const,
      conditions: [],
    } satisfies BinRuleGroup,
  }));
}
