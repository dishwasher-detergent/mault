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
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  createCollectionSchema,
  type CreateCollectionFormValues,
} from "@/schemas/collections.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconEdit, IconLoader2, IconPlus } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";

export function CollectionSwitcher() {
  const {
    collections,
    activeCollection,
    isActivating,
    isMutating,
    createCollection,
    activateCollection,
  } = useCollections();
  const { isLoading } = useQuery(collectionsQueryOptions);
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<CreateCollectionFormValues>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: { name: "" },
    mode: "onChange",
  });

  const handleCreate = useCallback(
    async (values: CreateCollectionFormValues) => {
      const isDuplicate = collections.some(
        (c) => c.name.trim().toLowerCase() === values.name.trim().toLowerCase(),
      );
      if (isDuplicate) {
        form.setError("name", {
          type: "manual",
          message: "A collection with this name already exists",
        });
        return;
      }
      await createCollection(values.name);
      form.reset();
      setCreateOpen(false);
    },
    [createCollection, collections, form],
  );

  const handleCreateDialogChange = useCallback(
    (open: boolean) => {
      setCreateOpen(open);
      if (!open) form.reset();
    },
    [form],
  );

  if (isLoading) {
    return (
      <ButtonGroup className="w-full">
        <Skeleton className="h-9 flex-1 rounded-lg" />
        <Skeleton className="size-9 shrink-0" />
        <Skeleton className="size-9 shrink-0" />
      </ButtonGroup>
    );
  }

  return (
    <Field>
      <FieldLabel>Collection</FieldLabel>
      <ButtonGroup className="w-full">
        <Select
          key={activeCollection?.guid ?? ""}
          value={activeCollection?.guid ?? ""}
          onValueChange={(guid) => activateCollection(guid!)}
        >
          <SelectTrigger className="flex-1 overflow-hidden" disabled={isActivating}>
            <SelectValue placeholder="No collection selected">
              <span className="flex items-center gap-1.5 min-w-0">
                {isActivating && (
                  <IconLoader2 className="size-3 animate-spin shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">
                  {activeCollection?.name ?? "No collection"}
                </span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {collections.map((c) => (
              <SelectItem key={c.guid} value={c.guid}>
                <span className="truncate">{c.name}</span>
                <span className="ml-2 text-xs text-muted-foreground tabular-nums">
                  {c.cardCount}
                </span>
              </SelectItem>
            ))}
            {collections.length === 0 && (
              <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                No collections yet
              </div>
            )}
          </SelectContent>
        </Select>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button nativeButton={false} variant="outline" size="icon">
                <Link to="/app/collections">
                  <IconEdit />
                </Link>
              </Button>
            }
          />
          <TooltipContent>Manage Collections</TooltipContent>
        </Tooltip>

        <DynamicDialog
          open={createOpen}
          onOpenChange={handleCreateDialogChange}
          title="New Collection"
          description="Create a new collection to scan cards into."
          trigger={
            <Button variant="outline" size="icon" disabled={isMutating}>
              <IconPlus />
            </Button>
          }
          footer={
            <>
              <Button variant="outline" onClick={() => handleCreateDialogChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(handleCreate)}
                disabled={!form.formState.isValid || isMutating}
              >
                {isMutating && <IconLoader2 className="size-4 animate-spin" />}
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
                  <FieldLabel htmlFor="collection-name">Collection name</FieldLabel>
                  <Input
                    {...field}
                    id="collection-name"
                    placeholder="e.g. Commander Collection, Draft Haul..."
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
    </Field>
  );
}
