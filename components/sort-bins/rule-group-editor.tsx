"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  BinCondition,
  BinRuleGroup,
  isRuleGroup,
} from "@/interfaces/sort-bins.interface";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback } from "react";
import { ConditionRow } from "./condition-row";

interface RuleGroupEditorProps {
  group: BinRuleGroup;
  onChange: (updated: BinRuleGroup) => void;
  onRemove?: () => void;
  depth?: number;
}

function createCondition(): BinCondition {
  return {
    id: crypto.randomUUID(),
    field: "rarity",
    operator: "in",
    value: [],
  };
}

function createGroup(): BinRuleGroup {
  return {
    id: crypto.randomUUID(),
    combinator: "and",
    conditions: [createCondition()],
  };
}

export function RuleGroupEditor({
  group,
  onChange,
  onRemove,
  depth = 0,
}: RuleGroupEditorProps) {
  const updateCondition = useCallback(
    (index: number, updated: BinCondition | BinRuleGroup) => {
      const newConditions = [...group.conditions];
      newConditions[index] = updated;
      onChange({ ...group, conditions: newConditions });
    },
    [group, onChange],
  );

  const removeCondition = useCallback(
    (index: number) => {
      const newConditions = group.conditions.filter((_, i) => i !== index);
      onChange({ ...group, conditions: newConditions });
    },
    [group, onChange],
  );

  const addCondition = useCallback(() => {
    onChange({
      ...group,
      conditions: [...group.conditions, createCondition()],
    });
  }, [group, onChange]);

  const addGroup = useCallback(() => {
    onChange({
      ...group,
      conditions: [...group.conditions, createGroup()],
    });
  }, [group, onChange]);

  const toggleCombinator = useCallback(
    (combinator: "and" | "or") => {
      onChange({ ...group, combinator });
    },
    [group, onChange],
  );

  return (
    <div
      className={`flex flex-col gap-2 ${depth > 0 ? "rounded-md border border-dashed p-2.5" : ""}`}
    >
      <div className="flex items-center gap-2">
        <ButtonGroup>
          <Button
            type="button"
            variant={group.combinator === "and" ? "default" : "outline"}
            onClick={() => toggleCombinator("and")}
          >
            AND
          </Button>
          <Button
            type="button"
            variant={group.combinator === "or" ? "default" : "outline"}
            onClick={() => toggleCombinator("or")}
          >
            OR
          </Button>
        </ButtonGroup>

        {onRemove && (
          <Button type="button" variant="ghost" size="icon" onClick={onRemove}>
            <IconTrash />
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2 pl-2">
        {group.conditions.map((item, index) =>
          isRuleGroup(item) ? (
            <RuleGroupEditor
              key={item.id}
              group={item}
              onChange={(updated) => updateCondition(index, updated)}
              onRemove={() => removeCondition(index)}
              depth={depth + 1}
            />
          ) : (
            <ConditionRow
              key={item.id}
              condition={item}
              onChange={(updated) => updateCondition(index, updated)}
              onRemove={() => removeCondition(index)}
            />
          ),
        )}
      </div>

      <div className="flex gap-1.5 pl-2">
        <Button type="button" variant="outline" onClick={addCondition}>
          <IconPlus /> Condition
        </Button>
        {depth < 2 && (
          <Button type="button" variant="outline" onClick={addGroup}>
            <IconPlus /> Group
          </Button>
        )}
      </div>
    </div>
  );
}
