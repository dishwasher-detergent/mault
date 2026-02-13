"use client";

import { RuleGroupEditor } from "@/components/sort-bins/rule-group-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BinConfig, BinRuleGroup } from "@/interfaces/sort-bins.interface";
import { useCallback, useEffect, useState } from "react";

interface BinConfigPanelProps {
  config: BinConfig;
  onSave: (
    binNumber: number,
    label: string,
    rules: BinRuleGroup,
    isCatchAll?: boolean,
  ) => void;
  onClear: (binNumber: number) => void;
}

export function BinConfigPanel({
  config,
  onSave,
  onClear,
}: BinConfigPanelProps) {
  const [label, setLabel] = useState("");
  const [isCatchAll, setIsCatchAll] = useState(false);
  const [rules, setRules] = useState<BinRuleGroup>({
    id: crypto.randomUUID(),
    combinator: "and",
    conditions: [],
  });

  useEffect(() => {
    setLabel(config.label);
    setIsCatchAll(config.isCatchAll ?? false);
    setRules(
      config.rules.conditions.length > 0
        ? config.rules
        : { id: crypto.randomUUID(), combinator: "and", conditions: [] },
    );
  }, [config]);

  const handleSave = useCallback(() => {
    onSave(config.binNumber, label, rules, isCatchAll);
  }, [config, label, rules, isCatchAll, onSave]);

  const handleClear = useCallback(() => {
    onClear(config.binNumber);
  }, [config, onClear]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3">
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
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bin-label">Label</Label>
            <Input
              id="bin-label"
              placeholder="e.g. Rares, Bulk, Expensive..."
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
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
