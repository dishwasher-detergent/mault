"use client";

import { Button } from "@/components/ui/button";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BinConfig, BinRuleGroup } from "@/interfaces/sort-bins.interface";
import { useCallback, useEffect, useState } from "react";
import { RuleGroupEditor } from "./rule-group-editor";

interface BinConfigDialogProps {
  config: BinConfig | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (binNumber: number, label: string, rules: BinRuleGroup) => void;
  onClear: (binNumber: number) => void;
}

export function BinConfigDialog({
  config,
  open,
  onOpenChange,
  onSave,
  onClear,
}: BinConfigDialogProps) {
  const [label, setLabel] = useState("");
  const [rules, setRules] = useState<BinRuleGroup>({
    id: crypto.randomUUID(),
    combinator: "and",
    conditions: [],
  });

  useEffect(() => {
    if (config && open) {
      setLabel(config.label);
      setRules(
        config.rules.conditions.length > 0
          ? config.rules
          : { id: crypto.randomUUID(), combinator: "and", conditions: [] },
      );
    }
  }, [config, open]);

  const handleSave = useCallback(() => {
    if (!config) return;
    onSave(config.binNumber, label, rules);
    onOpenChange(false);
  }, [config, label, rules, onSave, onOpenChange]);

  const handleClear = useCallback(() => {
    if (!config) return;
    onClear(config.binNumber);
    onOpenChange(false);
  }, [config, onClear, onOpenChange]);

  if (!config) return null;

  return (
    <DynamicDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Configure Bin ${config.binNumber}`}
      className="sm:max-w-2xl flex flex-col max-h-[85dvh]"
      footer={
        <>
          <Button type="button" variant="destructive" onClick={handleClear}>
            Clear
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bin-label">Label</Label>
          <Input
            id="bin-label"
            placeholder="e.g. Rares, Bulk, Expensive..."
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Rules</Label>
          <ScrollArea className="max-h-[50dvh]">
            <div className="pr-3">
              <RuleGroupEditor group={rules} onChange={setRules} />
            </div>
          </ScrollArea>
        </div>
      </div>
    </DynamicDialog>
  );
}
