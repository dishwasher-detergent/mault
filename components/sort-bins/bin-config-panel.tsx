"use client";

import { RuleGroupEditor } from "@/components/sort-bins/rule-group-editor";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBinConfigs } from "@/hooks/use-bin-configs";
import { BinRuleGroup } from "@/interfaces/sort-bins.interface";
import { useCallback, useEffect, useState } from "react";
import { Label } from "../ui/label";

export function BinConfigPanel() {
  const { selectedConfig: config, save, clear } = useBinConfigs();

  const [isCatchAll, setIsCatchAll] = useState(false);
  const [rules, setRules] = useState<BinRuleGroup>({
    id: crypto.randomUUID(),
    combinator: "and",
    conditions: [],
  });

  useEffect(() => {
    setIsCatchAll(config.isCatchAll ?? false);
    setRules(
      config.rules.conditions.length > 0
        ? config.rules
        : { id: crypto.randomUUID(), combinator: "and", conditions: [] },
    );
  }, [config]);

  const handleSave = useCallback(() => {
    save(config.binNumber, rules, isCatchAll);
  }, [config, rules, isCatchAll, save]);

  const handleClear = useCallback(() => {
    clear(config.binNumber);
  }, [config, clear]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Bin {config.binNumber}</h2>
        <div className="flex gap-1.5">
          <Button type="button" variant="destructive" onClick={handleClear}>
            Clear
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 ">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={isCatchAll ? "default" : "outline"}
              size="sm"
              onClick={() => setIsCatchAll(!isCatchAll)}
            >
              {isCatchAll ? "Catch-all enabled" : "Set as catch-all"}
            </Button>
            {isCatchAll && (
              <p className="text-xs text-muted-foreground">
                Cards that don&apos;t match any other bin will go here.
              </p>
            )}
          </div>
          {!isCatchAll && (
            <div className="flex flex-col gap-1.5">
              <Label>Rules</Label>
              <RuleGroupEditor group={rules} onChange={setRules} />
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
