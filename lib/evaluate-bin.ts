import type { ScryfallCard } from "@/interfaces/scryfall.interface";
import type {
  BinCondition,
  BinConfig,
  BinRuleGroup,
} from "@/interfaces/sort-bins.interface";
import { isRuleGroup } from "@/interfaces/sort-bins.interface";

function getCardValue(
  card: ScryfallCard,
  field: BinCondition["field"],
): string | number | string[] {
  switch (field) {
    case "rarity":
      return card.rarity;
    case "color_identity":
      return card.color_identity;
    case "type_line":
      return card.type_line;
    case "set":
      return card.set;
    case "price_usd":
      return parseFloat(card.prices.usd ?? "0");
    case "cmc":
      return card.cmc;
    case "name":
      return card.name;
  }
}

function evaluateCondition(
  card: ScryfallCard,
  condition: BinCondition,
): boolean {
  const cardValue = getCardValue(card, condition.field);
  const { operator, value } = condition;

  switch (operator) {
    case "equals":
      if (Array.isArray(cardValue) && Array.isArray(value)) {
        return (
          cardValue.length === value.length &&
          cardValue.every((v) => value.includes(v)) &&
          value.every((v) => cardValue.includes(v))
        );
      }
      return String(cardValue) === String(value);

    case "not_equals":
      if (Array.isArray(cardValue) && Array.isArray(value)) {
        return !(
          cardValue.length === value.length &&
          cardValue.every((v) => value.includes(v)) &&
          value.every((v) => cardValue.includes(v))
        );
      }
      return String(cardValue) !== String(value);

    case "contains":
      return String(cardValue)
        .toLowerCase()
        .includes(String(value).toLowerCase());

    case "not_contains":
      return !String(cardValue)
        .toLowerCase()
        .includes(String(value).toLowerCase());

    case "gt":
      return Number(cardValue) > Number(value);

    case "gte":
      return Number(cardValue) >= Number(value);

    case "lt":
      return Number(cardValue) < Number(value);

    case "lte":
      return Number(cardValue) <= Number(value);

    case "in":
      return Array.isArray(value) && value.includes(String(cardValue));

    case "not_in":
      return Array.isArray(value) && !value.includes(String(cardValue));

    case "contains_any":
      return (
        Array.isArray(cardValue) &&
        Array.isArray(value) &&
        value.some((v) => cardValue.includes(v))
      );

    case "contains_all":
      return (
        Array.isArray(cardValue) &&
        Array.isArray(value) &&
        value.every((v) => cardValue.includes(v))
      );

    case "contains_none":
      return (
        Array.isArray(cardValue) &&
        Array.isArray(value) &&
        !value.some((v) => cardValue.includes(v))
      );

    default:
      return false;
  }
}

function evaluateRuleGroup(card: ScryfallCard, group: BinRuleGroup): boolean {
  if (group.conditions.length === 0) return false;

  const results = group.conditions.map((item) =>
    isRuleGroup(item)
      ? evaluateRuleGroup(card, item)
      : evaluateCondition(card, item),
  );

  return group.combinator === "and"
    ? results.every(Boolean)
    : results.some(Boolean);
}

/** Returns the first matching bin config for a card, or undefined if none match. */
export function evaluateCardBin(
  card: ScryfallCard,
  configs: BinConfig[],
): BinConfig | undefined {
  for (const config of configs) {
    if (
      config.rules.conditions.length > 0 &&
      evaluateRuleGroup(card, config.rules)
    ) {
      return config;
    }
  }
  return undefined;
}
