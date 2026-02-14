"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_DEFINITIONS } from "@/constants/sort-bins.constant";
import {
  BinCondition,
  ConditionField,
  ConditionOperator,
  FieldMeta,
} from "@/interfaces/sort-bins.interface";
import { cn } from "@/lib/utils";
import { IconChevronDown, IconX } from "@tabler/icons-react";
import { useCallback } from "react";

interface ConditionRowProps {
  condition: BinCondition;
  onChange: (updated: BinCondition) => void;
  onRemove: () => void;
}

function getFieldMeta(field: ConditionField): FieldMeta | undefined {
  return FIELD_DEFINITIONS.find((f) => f.field === field);
}

function MultiSelect({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  const selectedLabels = options
    .filter((opt) => value.includes(opt.value))
    .map((opt) => opt.label);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          buttonVariants({ variant: "outline" }),
          "min-w-24 flex-1",
        )}
      >
        <span className="truncate flex-1 text-left">
          {selectedLabels.length > 0 ? selectedLabels.join(", ") : "Select..."}
        </span>
        <IconChevronDown className="size-4 opacity-50 shrink-0" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt.value}
            checked={value.includes(opt.value)}
            onSelect={(e) => e.preventDefault()}
            onClick={() => {
              if (value.includes(opt.value)) {
                onChange(value.filter((v) => v !== opt.value));
              } else {
                onChange([...value, opt.value]);
              }
            }}
          >
            {opt.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ConditionRow({
  condition,
  onChange,
  onRemove,
}: ConditionRowProps) {
  const fieldMeta = getFieldMeta(condition.field);

  const handleFieldChange = useCallback(
    (field: ConditionField) => {
      const newMeta = getFieldMeta(field);
      const defaultOp = newMeta?.operators[0]?.value ?? "equals";
      const defaultValue =
        newMeta?.type === "enum" || newMeta?.type === "set" ? [] : "";
      onChange({
        ...condition,
        field,
        operator: defaultOp,
        value: defaultValue,
      });
    },
    [condition, onChange],
  );

  const handleOperatorChange = useCallback(
    (operator: ConditionOperator) => {
      onChange({ ...condition, operator });
    },
    [condition, onChange],
  );

  const handleValueChange = useCallback(
    (value: string | number | string[]) => {
      onChange({ ...condition, value });
    },
    [condition, onChange],
  );

  const renderValueInput = () => {
    if (!fieldMeta) return null;

    if (
      (fieldMeta.type === "enum" || fieldMeta.type === "set") &&
      fieldMeta.options
    ) {
      const isMulti = [
        "in",
        "not_in",
        "contains_any",
        "contains_all",
        "contains_none",
      ].includes(condition.operator);

      if (isMulti) {
        const arrValue = Array.isArray(condition.value) ? condition.value : [];
        return (
          <MultiSelect
            options={fieldMeta.options}
            value={arrValue}
            onChange={handleValueChange}
          />
        );
      }

      return (
        <Select
          value={String(condition.value)}
          onValueChange={(val) => handleValueChange(val as string)}
        >
          <SelectTrigger className="min-w-24 flex-1">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {fieldMeta.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }

    if (fieldMeta.type === "numeric") {
      return (
        <Input
          type="number"
          step="any"
          placeholder="0"
          max={100000}
          className="min-w-24 flex-1"
          value={condition.value === "" ? "" : String(condition.value)}
          onChange={(e) => {
            const raw = e.target.value;
            handleValueChange(raw === "" ? "" : Number(raw));
          }}
        />
      );
    }

    return (
      <Input
        type="text"
        placeholder="Value..."
        maxLength={200}
        className="min-w-24 flex-1"
        value={String(condition.value)}
        onChange={(e) => handleValueChange(e.target.value)}
      />
    );
  };

  return (
    <div className="flex flex-wrap items-start gap-1.5">
      <Select
        value={condition.field}
        onValueChange={(val) => handleFieldChange(val as ConditionField)}
      >
        <SelectTrigger className="min-w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELD_DEFINITIONS.map((f) => (
            <SelectItem key={f.field} value={f.field}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {fieldMeta && (
        <Select
          value={condition.operator}
          onValueChange={(val) =>
            handleOperatorChange(val as ConditionOperator)
          }
        >
          <SelectTrigger className="min-w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {fieldMeta.operators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {renderValueInput()}

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="shrink-0"
      >
        <IconX />
      </Button>
    </div>
  );
}
