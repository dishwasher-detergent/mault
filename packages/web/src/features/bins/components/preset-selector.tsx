import { AuditDrawer, type AuditEntry } from "@/components/audit-drawer";
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
import {
  binsQueryOptions,
  getBinSetHistory,
  revertBinSet,
  type BinSetAuditEntry,
} from "@/features/bins/api/sort-bins";
import { useBinConfigs } from "@/features/bins/api/use-bin-configs";
import type { PresetSelectorProps } from "@/features/bins/types";
import {
  createSetSchema,
  type CreateSetFormValues,
} from "@/schemas/sort-bins.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconClockHour3,
  IconEdit,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import type { BinConfig, BinRuleGroup, BinSet } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { toast } from "sonner";

function countConditions(group: BinRuleGroup): number {
  return group.conditions.reduce((n, c) => {
    if ("combinator" in c) return n + countConditions(c as BinRuleGroup);
    return n + 1;
  }, 0);
}

function BinSnapshotSummary({ snapshot }: { snapshot: BinConfig[] }) {
  return (
    <div className="flex flex-col gap-0.5">
      {snapshot.map((bin) => {
        const count = countConditions(bin.rules);
        return (
          <div key={bin.binNumber} className="flex gap-2">
            <span className="w-10 shrink-0 text-muted-foreground">
              Bin {bin.binNumber}
            </span>
            <span>
              {bin.isCatchAll
                ? "catch-all"
                : count === 0
                  ? "no rules"
                  : `${count} condition${count !== 1 ? "s" : ""}`}
            </span>
          </div>
        );
      })}
    </div>
  );
}

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
  const queryClient = useQueryClient();
  const { isLoading } = useQuery(binsQueryOptions);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: historyResult, isLoading: historyLoading } = useQuery({
    queryKey: ["bins", "history", selectedSet?.guid],
    queryFn: () => getBinSetHistory(selectedSet!.guid),
    enabled: historyOpen && !!selectedSet?.guid,
    staleTime: 0,
  });

  const revertMutation = useMutation({
    mutationFn: revertBinSet,
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData<BinSet[]>(["bins"], result.data);
        queryClient.invalidateQueries({ queryKey: ["bins", "history", selectedSet?.guid] });
        setHistoryOpen(false);
        toast.success("Reverted to previous bin set state");
      }
    },
    onError: () => toast.error("Failed to revert"),
  });

  const historyEntries = useMemo((): AuditEntry[] => {
    return (historyResult?.data ?? []).map((entry: BinSetAuditEntry) => ({
      guid: entry.guid,
      createdAt: entry.createdAt,
      body: <BinSnapshotSummary snapshot={entry.snapshot} />,
    }));
  }, [historyResult]);

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
        <Skeleton className="h-9 flex-1 rounded-lg" />
        {readOnly ? (
          <Skeleton className="size-9 shrink-0" />
        ) : (
          <>
            <Skeleton className="size-9 shrink-0" />
            <Skeleton className="size-9 shrink-0" />
            <Skeleton className="size-9 shrink-0" />
            <Skeleton className="size-9 shrink-0" />
          </>
        )}
      </ButtonGroup>
    );
  }

  return (
    <Field>
      <FieldLabel>Sorting Logic</FieldLabel>
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
                      <FieldLabel htmlFor="rename-set-name">
                        Set name
                      </FieldLabel>
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
                <Button
                  variant="outline"
                  size="icon"
                  disabled={isPresetMutating}
                >
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  disabled={!selectedSet}
                  onClick={() => setHistoryOpen(true)}
                >
                  <IconClockHour3 />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View History</TooltipContent>
            </Tooltip>
          </>
        )}
      </ButtonGroup>

      <AuditDrawer
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        title="Bin Set History"
        entries={historyEntries}
        isLoading={historyLoading}
        onRevert={(guid) => revertMutation.mutate(guid)}
        isReverting={revertMutation.isPending}
      />
    </Field>
  );
}
