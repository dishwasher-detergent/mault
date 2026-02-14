"use client";

import { RuleGroupEditor } from "@/components/sort-bins/rule-group-editor";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBinConfigs } from "@/hooks/use-bin-configs";
import { BinRuleGroup } from "@/interfaces/sort-bins.interface";
import { binConfigSchema } from "@/schemas/sort-bins.schema";
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
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setIsCatchAll(config.isCatchAll ?? false);
    setRules(
      config.rules.conditions.length > 0
        ? config.rules
        : { id: crypto.randomUUID(), combinator: "and", conditions: [] },
    );
    setValidationError(null);
  }, [config]);

  const handleSave = useCallback(() => {
    const result = binConfigSchema.safeParse({ isCatchAll, rules });
    if (!result.success) {
      const firstError = result.error.issues[0];
      setValidationError(firstError?.message ?? "Invalid bin configuration");
      return;
    }
    setValidationError(null);
    save(config.binNumber, rules, isCatchAll);
  }, [config, rules, isCatchAll, save]);

  const handleClear = useCallback(() => {
    setValidationError(null);
    clear(config.binNumber);
  }, [config, clear]);

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Bin {config.binNumber}</h2>
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
        <ScrollArea>
          <div className="flex flex-col gap-2">
            <Label>Rules</Label>
            <RuleGroupEditor group={rules} onChange={setRules} />
          </div>
        </ScrollArea>
      )}
      {validationError && (
        <p className="text-destructive text-xs">{validationError}</p>
      )}
      <div className="flex gap-1.5">
        <Button type="button" variant="destructive" onClick={handleClear}>
          Clear
        </Button>
        <Button type="button" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
}
