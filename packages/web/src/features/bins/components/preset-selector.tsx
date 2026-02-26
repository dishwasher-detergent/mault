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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { binsQueryOptions } from "@/features/bins/api/sort-bins";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import type { PresetSelectorProps } from "@/features/bins/types";
import {
  createSetSchema,
  type CreateSetFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconEdit,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";

export function PresetSelector({ readOnly }: PresetSelectorProps) {
  const {
    sets,
    activateSet,
    createSet,
    renameSet,
    deleteSet,
    selectedSet,
    isActivating,
    isPresetMutating,
  } = useBinConfigs();
  const { isLoading } = useQuery(binsQueryOptions);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const createForm = useForm<CreateSetFormValues>({
    resolver: zodResolver(createSetSchema),
    defaultValues: { name: "" },
    mode: "onChange",
  });

  const renameForm = useForm<CreateSetFormValues>({
    resolver: zodResolver(createSetSchema),
    defaultValues: { name: selectedSet?.name ?? "" },
    mode: "onChange",
  });

  const handleCreate = useCallback(
    async (values: CreateSetFormValues) => {
      await createSet(values.name);
      createForm.reset();
      setCreateDialogOpen(false);
    },
    [createSet, createForm],
  );

  const handleCreateDialogChange = useCallback(
    (open: boolean) => {
      setCreateDialogOpen(open);
      if (!open) createForm.reset();
    },
    [createForm],
  );

  const handleRename = useCallback(
    async (values: CreateSetFormValues) => {
      if (!selectedSet) return;
      await renameSet(selectedSet.guid, values.name);
      setRenameDialogOpen(false);
    },
    [selectedSet, renameSet],
  );

  const handleRenameDialogChange = useCallback(
    (open: boolean) => {
      setRenameDialogOpen(open);
      if (open) renameForm.reset({ name: selectedSet?.name ?? "" });
    },
    [selectedSet, renameForm],
  );

  const handleDelete = useCallback(async () => {
    if (!selectedSet) return;
    await deleteSet(selectedSet.guid);
    setDeleteDialogOpen(false);
  }, [selectedSet, deleteSet]);

  if (isLoading) {
    return (
      <ButtonGroup className="w-full">
        <Skeleton className="h-9 flex-1 rounded-md" />
        {readOnly ? (
          <Skeleton className="size-9 shrink-0" />
        ) : (
          <>
            <Skeleton className="size-9 shrink-0" />
            <Skeleton className="size-9 shrink-0" />
            <Skeleton className="size-9 shrink-0" />
          </>
        )}
      </ButtonGroup>
    );
  }

  return (
    <ButtonGroup className="w-full">
      <Select
        key={selectedSet?.guid ?? ""}
        value={selectedSet?.guid ?? ""}
        onValueChange={(guid) => activateSet(guid!)}
      >
        <SelectTrigger
          className="flex-1 overflow-hidden"
          disabled={isActivating}
        >
          <SelectValue placeholder="Select a set...">
            <span className="flex items-center gap-1.5 min-w-0">
              {isActivating && (
                <IconLoader2 className="size-3 animate-spin shrink-0 text-muted-foreground" />
              )}
              <span className="truncate">{selectedSet?.name}</span>
            </span>
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
      {readOnly ? (
        <>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button nativeButton={false} variant="outline" size="icon">
                  <Link to="bins">
                    <IconEdit />
                  </Link>
                </Button>
              }
            ></TooltipTrigger>
            <TooltipContent>Edit Preset</TooltipContent>
          </Tooltip>
        </>
      ) : (
        <>
          <DynamicDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            title="Delete Set"
            description={`Are you sure you want to delete "${selectedSet?.name}"? This cannot be undone.`}
            trigger={
              <Button
                variant="outline"
                size="icon"
                disabled={!selectedSet || isPresetMutating}
              >
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
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPresetMutating}
                >
                  {isPresetMutating && (
                    <IconLoader2 className="size-4 animate-spin" />
                  )}
                  Delete
                </Button>
              </>
            }
            footerClassName="flex-col-reverse md:flex-row"
          />
          <DynamicDialog
            open={renameDialogOpen}
            onOpenChange={handleRenameDialogChange}
            title="Rename Set"
            description="Enter a new name for this set."
            trigger={
              <Button
                variant="outline"
                size="icon"
                disabled={!selectedSet || isPresetMutating}
              >
                <IconEdit />
              </Button>
            }
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setRenameDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={renameForm.handleSubmit(handleRename)}
                  disabled={!renameForm.formState.isValid || isPresetMutating}
                >
                  {isPresetMutating && (
                    <IconLoader2 className="size-4 animate-spin" />
                  )}
                  Rename
                </Button>
              </>
            }
            footerClassName="flex-col-reverse md:flex-row"
          >
            <form onSubmit={renameForm.handleSubmit(handleRename)}>
              <Controller
                name="name"
                control={renameForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid || undefined}>
                    <FieldLabel htmlFor="rename-set-name">Set name</FieldLabel>
                    <Input
                      {...field}
                      id="rename-set-name"
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
          <DynamicDialog
            open={createDialogOpen}
            onOpenChange={handleCreateDialogChange}
            title="New Set"
            description="Create a new set with 7 empty bins."
            trigger={
              <Button variant="outline" size="icon" disabled={isPresetMutating}>
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
                  onClick={createForm.handleSubmit(handleCreate)}
                  disabled={!createForm.formState.isValid || isPresetMutating}
                >
                  {isPresetMutating && (
                    <IconLoader2 className="size-4 animate-spin" />
                  )}
                  Create
                </Button>
              </>
            }
            footerClassName="flex-col-reverse md:flex-row"
          >
            <form onSubmit={createForm.handleSubmit(handleCreate)}>
              <Controller
                name="name"
                control={createForm.control}
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
        </>
      )}
    </ButtonGroup>
  );
}
