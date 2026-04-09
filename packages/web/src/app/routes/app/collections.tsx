import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import {
  createCollectionSchema,
  type CreateCollectionFormValues,
} from "@/schemas/collections.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconCheck,
  IconEdit,
  IconFolders,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";

export default function CollectionsPage() {
  const {
    collections,
    activeCollection,
    isActivating,
    isMutating,
    createCollection,
    renameCollection,
    activateCollection,
    deleteCollection,
  } = useCollections();
  const { isLoading } = useQuery(collectionsQueryOptions);

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ guid: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ guid: string; name: string } | null>(null);

  const createForm = useForm<CreateCollectionFormValues>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: { name: "" },
    mode: "onChange",
  });

  const renameForm = useForm<CreateCollectionFormValues>({
    resolver: zodResolver(createCollectionSchema),
    defaultValues: { name: renameTarget?.name ?? "" },
    mode: "onChange",
  });

  const handleCreate = useCallback(
    async (values: CreateCollectionFormValues) => {
      await createCollection(values.name);
      createForm.reset();
      setCreateOpen(false);
    },
    [createCollection, createForm],
  );

  const handleRename = useCallback(
    async (values: CreateCollectionFormValues) => {
      if (!renameTarget) return;
      await renameCollection(renameTarget.guid, values.name);
      setRenameTarget(null);
    },
    [renameTarget, renameCollection],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteCollection(deleteTarget.guid);
    setDeleteTarget(null);
  }, [deleteTarget, deleteCollection]);

  return (
    <div className="flex flex-col p-6 max-w-2xl mx-auto w-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Collections</h1>
          <p className="text-xs text-muted-foreground">
            Organize scanned cards into named collections
          </p>
        </div>
        <DynamicDialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) createForm.reset();
          }}
          title="New Collection"
          description="Create a new collection to scan cards into."
          trigger={
            <Button disabled={isMutating}>
              <IconPlus className="size-4" />
              New Collection
            </Button>
          }
          footer={
            <>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={createForm.handleSubmit(handleCreate)}
                disabled={!createForm.formState.isValid || isMutating}
              >
                {isMutating && <IconLoader2 className="size-4 animate-spin" />}
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
                  <FieldLabel htmlFor="new-collection-name">Collection name</FieldLabel>
                  <Input
                    {...field}
                    id="new-collection-name"
                    placeholder="e.g. Commander Collection, Draft Haul..."
                    aria-invalid={fieldState.invalid}
                    autoFocus
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </form>
        </DynamicDialog>
      </div>

      <div className="rounded-lg border divide-y overflow-hidden">
        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-8 rounded-md shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ))}

        {!isLoading && collections.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <IconFolders className="size-8" />
            <p className="text-sm font-medium">No collections yet</p>
            <p className="text-xs">Create a collection to start scanning cards</p>
          </div>
        )}

        {collections.map((collection) => {
          const isActive = collection.guid === activeCollection?.guid;
          return (
            <div key={collection.guid} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => !isActive && activateCollection(collection.guid)}
                disabled={isActivating || isActive}
                className="size-8 rounded-md border flex items-center justify-center shrink-0 transition-colors disabled:cursor-default"
                style={isActive ? { background: "var(--primary)", borderColor: "var(--primary)" } : {}}
                title={isActive ? "Active collection" : "Set as active"}
              >
                {isActive ? (
                  <IconCheck className="size-4 text-primary-foreground" />
                ) : (
                  <span className="size-2 rounded-full bg-muted-foreground/30" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{collection.name}</p>
                <p className="text-xs text-muted-foreground">
                  {collection.cardCount} {collection.cardCount === 1 ? "card" : "cards"} ·{" "}
                  {new Date(collection.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isMutating}
                  onClick={() => {
                    renameForm.reset({ name: collection.name });
                    setRenameTarget({ guid: collection.guid, name: collection.name });
                  }}
                >
                  <IconEdit />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isMutating}
                  onClick={() => setDeleteTarget({ guid: collection.guid, name: collection.name })}
                >
                  <IconTrash className="text-destructive" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rename dialog */}
      <DynamicDialog
        open={!!renameTarget}
        onOpenChange={(open) => { if (!open) setRenameTarget(null); }}
        title="Rename Collection"
        description="Enter a new name for this collection."
        trigger={<span />}
        footer={
          <>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={renameForm.handleSubmit(handleRename)}
              disabled={!renameForm.formState.isValid || isMutating}
            >
              {isMutating && <IconLoader2 className="size-4 animate-spin" />}
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
                <FieldLabel htmlFor="rename-collection-name">Collection name</FieldLabel>
                <Input
                  {...field}
                  id="rename-collection-name"
                  aria-invalid={fieldState.invalid}
                  autoFocus
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </form>
      </DynamicDialog>

      {/* Delete dialog */}
      <DynamicDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Collection"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? All ${deleteTarget?.name ? "cards in this collection" : "cards"} will also be deleted. This cannot be undone.`}
        trigger={<span />}
        footer={
          <>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isMutating}
            >
              {isMutating && <IconLoader2 className="size-4 animate-spin" />}
              Delete
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      />
    </div>
  );
}
