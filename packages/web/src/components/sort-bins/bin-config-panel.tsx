import { RuleGroupEditor } from "@/components/sort-bins/rule-group-editor";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBinConfigs } from "@/hooks/use-bin-configs";
import { BinRuleGroup } from "@magic-vault/shared";
import {
  binConfigSchema,
  type BinConfigFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { Label } from "../ui/label";

function emptyRuleGroup(): BinRuleGroup {
  return { id: crypto.randomUUID(), combinator: "and", conditions: [] };
}

export function BinConfigPanel() {
  const { selectedConfig: config, save, clear, configs } = useBinConfigs();

  const form = useForm<BinConfigFormValues>({
    resolver: zodResolver(binConfigSchema),
    defaultValues: {
      isCatchAll: false,
      rules: emptyRuleGroup(),
    },
  });

  useEffect(() => {
    form.reset({
      isCatchAll: config.isCatchAll ?? false,
      rules:
        config.rules.conditions.length > 0
          ? config.rules
          : emptyRuleGroup(),
    });
  }, [config, form]);

  const isOnlyCatchAll =
    config.isCatchAll &&
    configs.filter((c) => c.isCatchAll && c.binNumber !== config.binNumber)
      .length === 0;

  const handleSave = useCallback(
    (values: BinConfigFormValues) => {
      if (!values.isCatchAll && isOnlyCatchAll) {
        form.setError("isCatchAll", {
          message: "At least one bin must be catch-all.",
        });
        return;
      }
      save(config.binNumber, values.rules as BinRuleGroup, values.isCatchAll);
    },
    [config, save, isOnlyCatchAll, form],
  );

  const handleClear = useCallback(() => {
    if (isOnlyCatchAll) {
      form.setError("isCatchAll", {
        message: "At least one bin must be catch-all.",
      });
      return;
    }
    form.reset({
      isCatchAll: false,
      rules: emptyRuleGroup(),
    });
    clear(config.binNumber);
  }, [config, clear, form, isOnlyCatchAll]);

  const isCatchAll = form.watch("isCatchAll");

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Bin {config.binNumber}</h2>
      </div>
      <Controller
        name="isCatchAll"
        control={form.control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={field.value ? "default" : "outline"}
              size="sm"
              onClick={() => field.onChange(!field.value)}
            >
              {field.value ? "Catch-all enabled" : "Set as catch-all"}
            </Button>
            {field.value && (
              <p className="text-xs text-muted-foreground">
                Cards that don&apos;t match any other bin will go here.
              </p>
            )}
          </div>
        )}
      />
      {!isCatchAll && (
        <ScrollArea>
          <div className="flex flex-col gap-2">
            <Label>Rules</Label>
            <Controller
              name="rules"
              control={form.control}
              render={({ field }) => (
                <RuleGroupEditor
                  group={field.value as BinRuleGroup}
                  onChange={field.onChange}
                />
              )}
            />
          </div>
        </ScrollArea>
      )}
      {form.formState.errors.isCatchAll && (
        <FieldError errors={[form.formState.errors.isCatchAll]} />
      )}
      {form.formState.errors.rules && (
        <FieldError errors={[form.formState.errors.rules]} />
      )}
      <div className="flex gap-1.5">
        <Button type="button" variant="destructive" onClick={handleClear}>
          Clear
        </Button>
        <Button type="button" onClick={form.handleSubmit(handleSave)}>
          Save
        </Button>
      </div>
    </div>
  );
}
