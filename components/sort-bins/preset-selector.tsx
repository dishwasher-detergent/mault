"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBinConfigs } from "@/hooks/use-bin-configs";
import {
  createSetSchema,
  type CreateSetFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";

export function PresetSelector() {
  const { sets, activateSet, createSet, deleteSet } = useBinConfigs();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<CreateSetFormValues>({
    resolver: zodResolver(createSetSchema),
    defaultValues: { name: "" },
    mode: "onChange",
  });

  const activeSet = sets.find((s) => s.isActive);

  const handleCreate = useCallback(
    async (values: CreateSetFormValues) => {
      await createSet(values.name);
      form.reset();
      setCreateDialogOpen(false);
    },
    [createSet, form],
  );

  const handleCreateDialogChange = useCallback(
    (open: boolean) => {
      setCreateDialogOpen(open);
      if (!open) form.reset();
    },
    [form],
  );

  const handleDelete = useCallback(async () => {
    if (!activeSet) return;
    await deleteSet(activeSet.guid);
    setDeleteDialogOpen(false);
  }, [activeSet, deleteSet]);

  return (
    <ButtonGroup className="w-full">
      <Select
        value={activeSet?.guid ?? ""}
        onValueChange={(guid) => activateSet(guid!)}
      >
        <SelectTrigger className="flex-1 overflow-hidden">
          <SelectValue placeholder="Select a set...">
            <span className="truncate">{activeSet?.name}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {sets.map((set) => (
            <SelectItem key={set.guid} value={set.guid}>
              <span className="truncate">{set.name}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <DynamicDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Set"
        description={`Are you sure you want to delete "${activeSet?.name}"? This cannot be undone.`}
        trigger={
          <Button variant="outline" size="icon" disabled={!activeSet}>
            <IconTrash />
          </Button>
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      />
      <DynamicDialog
        open={createDialogOpen}
        onOpenChange={handleCreateDialogChange}
        title="New Set"
        description="Create a new set with 7 empty bins."
        trigger={
          <Button variant="outline" size="icon">
            <IconPlus />
          </Button>
        }
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => handleCreateDialogChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(handleCreate)}
              disabled={!form.formState.isValid}
            >
              Create
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      >
        <form onSubmit={form.handleSubmit(handleCreate)}>
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid || undefined}>
                <FieldLabel htmlFor="set-name">Set name</FieldLabel>
                <Input
                  {...field}
                  id="set-name"
                  placeholder="Set name..."
                  aria-invalid={fieldState.invalid}
                  autoFocus
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </form>
      </DynamicDialog>
    </ButtonGroup>
  );
}
