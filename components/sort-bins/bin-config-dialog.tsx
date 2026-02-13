"use client";

import { useCallback, useEffect, useState } from "react";
import { BinConfig, BinRuleGroup } from "@/interfaces/sort-bins.interface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl flex flex-col max-h-[85dvh]">
        <DialogHeader>
          <DialogTitle>Configure Bin {config.binNumber}</DialogTitle>
        </DialogHeader>

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

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="destructive" onClick={handleClear}>
            Clear
          </Button>
          <div className="flex-1" />
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
