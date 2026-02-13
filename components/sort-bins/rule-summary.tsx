import { FIELD_DEFINITIONS } from "@/constants/sort-bins.constant";
import {
  BinCondition,
  BinRuleGroup,
  isRuleGroup,
} from "@/interfaces/sort-bins.interface";

function formatCondition(condition: BinCondition): string {
  const fieldMeta = FIELD_DEFINITIONS.find((f) => f.field === condition.field);
  const fieldLabel = fieldMeta?.label ?? condition.field;
  const opMeta = fieldMeta?.operators.find(
    (o) => o.value === condition.operator,
  );
  const opLabel = opMeta?.label ?? condition.operator;

  let valueStr: string;
  if (Array.isArray(condition.value)) {
    const labels = condition.value.map((v) => {
      const opt = fieldMeta?.options?.find((o) => o.value === v);
      return opt?.label ?? v;
    });
    valueStr = `[${labels.join(", ")}]`;
  } else if (condition.field === "price_usd") {
    valueStr = `$${condition.value}`;
  } else {
    const opt = fieldMeta?.options?.find(
      (o) => o.value === String(condition.value),
    );
    valueStr = opt?.label ?? String(condition.value);
  }

  return `${fieldLabel} ${opLabel} ${valueStr}`;
}

function formatGroup(group: BinRuleGroup): string {
  if (group.conditions.length === 0) return "No conditions";

  const parts = group.conditions.map((item) => {
    if (isRuleGroup(item)) {
      return `(${formatGroup(item)})`;
    }
    return formatCondition(item);
  });

  const joiner = group.combinator === "and" ? " AND " : " OR ";
  return parts.join(joiner);
}

export function RuleSummary({ rules }: { rules: BinRuleGroup }) {
  const text = formatGroup(rules);

  return (
    <p className="text-muted-foreground text-xs line-clamp-3 wrap-break-words">
      {text}
    </p>
  );
}
