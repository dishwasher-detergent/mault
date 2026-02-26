import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RuleSummary } from "@/features/bins/components/rule-summary";
import { BinConfig, isRuleGroup } from "@magic-vault/shared";

interface BinCardProps {
  config: BinConfig;
  active?: boolean;
  onClick: () => void;
}

function countConditions(config: BinConfig): number {
  function count(items: BinConfig["rules"]["conditions"]): number {
    return items.reduce((acc, item) => {
      if (isRuleGroup(item)) {
        return acc + count(item.conditions);
      }
      return acc + 1;
    }, 0);
  }
  return count(config.rules.conditions);
}

export function BinCard({ config, active, onClick }: BinCardProps) {
  const isEmpty = config.rules.conditions.length === 0;
  const conditionCount = countConditions(config);

  return (
    <Button
      variant={active ? "secondary" : "outline"}
      className="h-auto transition-colors hover:bg-muted/50 border rounded-lg p-2 flex flex-col justify-start text-start font-normal"
      onClick={onClick}
    >
      <div className="flex flex-row justify-between gap-2 items-center w-full">
        <p className="font-medium text-sm">Bin {config.binNumber}</p>
        {config.isCatchAll ? (
          <Badge variant="default">Catch-all</Badge>
        ) : (
          !isEmpty && (
            <Badge variant="secondary">
              {conditionCount} rule{conditionCount !== 1 ? "s" : ""}
            </Badge>
          )
        )}
      </div>
      <div className="w-full text-xs">
        {config.isCatchAll ? (
          <p className="text-xs text-muted-foreground">All unmatched cards</p>
        ) : isEmpty ? (
          <p className="text-xs">Click to configure</p>
        ) : (
          <RuleSummary rules={config.rules} />
        )}
      </div>
    </Button>
  );
}
