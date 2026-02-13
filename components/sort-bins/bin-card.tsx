"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BinConfig, isRuleGroup } from "@/interfaces/sort-bins.interface";
import { RuleSummary } from "./rule-summary";

interface BinCardProps {
  config: BinConfig;
  onClick: () => void;
}

function countConditions(config: BinConfig): number {
  function count(
    items: BinConfig["rules"]["conditions"],
  ): number {
    return items.reduce((acc, item) => {
      if (isRuleGroup(item)) {
        return acc + count(item.conditions);
      }
      return acc + 1;
    }, 0);
  }
  return count(config.rules.conditions);
}

export function BinCard({ config, onClick }: BinCardProps) {
  const isEmpty =
    !config.label && config.rules.conditions.length === 0;
  const conditionCount = countConditions(config);

  return (
    <Card
      size="sm"
      className={`cursor-pointer transition-colors hover:bg-muted/50 ${isEmpty ? "border-dashed ring-0 border" : ""}`}
      onClick={onClick}
    >
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span>Bin {config.binNumber}</span>
          {!isEmpty && (
            <Badge variant="secondary">
              {conditionCount} rule{conditionCount !== 1 ? "s" : ""}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isEmpty ? (
          <p className="text-muted-foreground text-xs">Click to configure</p>
        ) : (
          <div className="flex flex-col gap-1">
            {config.label && (
              <p className="text-xs font-medium truncate">{config.label}</p>
            )}
            <RuleSummary rules={config.rules} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
