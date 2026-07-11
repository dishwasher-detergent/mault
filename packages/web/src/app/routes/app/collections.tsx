import { DeleteDialog } from "@/components/delete-dialog";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { useCollections } from "@/features/collections/api/use-collections";
import { useOrg } from "@/features/companies/api/use-organization";
import {
  createCollectionSchema,
  type CreateCollectionFormValues,
} from "@/schemas/collections.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconCheck,
  IconEdit,
  IconEraser,
  IconFolders,
  IconLayoutGrid,
  IconLoader2,
  IconPlayerPlay,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link } from "react-router-dom";

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
    emptyCollection,
  } = useCollections();
  const { activeOrg } = useOrg();
  const { isLoading } = useQuery({
    ...collectionsQueryOptions,
    enabled: !!activeOrg,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{
    guid: string;
    name: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    guid: string;
    name: string;
  } | null>(null);
  const [emptyTarget, setEmptyTarget] = useState<{
    guid: string;
    name: string;
  } | null>(null);

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
      const isDuplicate = collections.some(
        (c) => c.name.trim().toLowerCase() === values.name.trim().toLowerCase(),
      );
      if (isDuplicate) {
        createForm.setError("name", {
          type: "manual",
          message: "A collection with this name already exists",
        });
        return;
      }
      await createCollection(values.name);
      createForm.reset();
      setCreateOpen(false);
    },
    [createCollection, collections, createForm],
  );

  const handleRename = useCallback(
    async (values: CreateCollectionFormValues) => {
      if (!renameTarget) return;
      const isDuplicate = collections.some(
        (c) =>
          c.guid !== renameTarget.guid &&
          c.name.trim().toLowerCase() === values.name.trim().toLowerCase(),
      );
      if (isDuplicate) {
        renameForm.setError("name", {
          type: "manual",
          message: "A collection with this name already exists",
        });
        return;
      }
      await renameCollection(renameTarget.guid, values.name);
      setRenameTarget(null);
    },
    [renameTarget, renameCollection, collections, renameForm],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteCollection(deleteTarget.guid);
    setDeleteTarget(null);
  }, [deleteTarget, deleteCollection]);

  const handleDeleteOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleEmpty = useCallback(async () => {
    if (!emptyTarget) return;
    await emptyCollection(emptyTarget.guid);
    setEmptyTarget(null);
  }, [emptyTarget, emptyCollection]);

  const handleEmptyOpenChange = useCallback((open: boolean) => {
    if (!open) setEmptyTarget(null);
  }, []);

  return (
    <div className="flex flex-col p-4 md:p-6 max-w-4xl mx-auto w-full gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold font-heading">Collections</h1>
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
                  <FieldLabel htmlFor="new-collection-name">
                    Collection name
                  </FieldLabel>
                  <Input
                    {...field}
                    id="new-collection-name"
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
            <p className="text-xs">
              Create a collection to start scanning cards
            </p>
          </div>
        )}

        {collections.map((collection) => {
          const isActive = collection.guid === activeCollection?.guid;
          return (
            <div
              key={collection.guid}
              className="flex items-center gap-3 px-4 py-3"
            >
              {isActive && <IconCheck className="size-4 text-primary" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {collection.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {collection.cardCount}{" "}
                  {collection.cardCount === 1 ? "card" : "cards"} ·{" "}
                  {new Date(collection.createdAt).toLocaleDateString()}
                </p>
              </div>

              <ButtonGroup className="shrink-0">
                {!isActive && (
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isActivating}
                          onClick={() => activateCollection(collection.guid)}
                        >
                          <IconPlayerPlay className="size-4 text-muted-foreground" />
                        </Button>
                      }
                    ></TooltipTrigger>
                    <TooltipContent>Set as active collection</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        render={
                          <Link to={`/app/collections/${collection.guid}/bins`}>
                            <IconLayoutGrid />
                          </Link>
                        }
                      />
                    }
                  ></TooltipTrigger>
                  <TooltipContent>Edit sorting rules</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={isMutating}
                        onClick={() => {
                          renameForm.reset({ name: collection.name });
                          setRenameTarget({
                            guid: collection.guid,
                            name: collection.name,
                          });
                        }}
                      >
                        <IconEdit />
                      </Button>
                    }
                  ></TooltipTrigger>
                  <TooltipContent>Rename</TooltipContent>
                </Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="destructive"
                        size="icon"
                        disabled={isMutating}
                      >
                        <IconTrash />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        setEmptyTarget({
                          guid: collection.guid,
                          name: collection.name,
                        })
                      }
                    >
                      <IconEraser />
                      Empty Collection
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() =>
                        setDeleteTarget({
                          guid: collection.guid,
                          name: collection.name,
                        })
                      }
                    >
                      <IconTrash />
                      Delete Collection
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>
            </div>
          );
        })}
      </div>
      <DynamicDialog
        open={!!renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
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
                <FieldLabel htmlFor="rename-collection-name">
                  Collection name
                </FieldLabel>
                <Input
                  {...field}
                  id="rename-collection-name"
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
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={handleDeleteOpenChange}
        title="Delete Collection"
        description={`Permanently deletes "${deleteTarget?.name}" and all its cards. This cannot be undone.`}
        confirm={{ type: "name", name: deleteTarget?.name ?? "" }}
        onConfirm={handleDelete}
      />
      <DeleteDialog
        open={!!emptyTarget}
        onOpenChange={handleEmptyOpenChange}
        title="Empty Collection"
        description={`Permanently removes all cards from "${emptyTarget?.name}", but keeps the collection itself. This cannot be undone.`}
        confirm={{ type: "name", name: emptyTarget?.name ?? "" }}
        confirmLabel="Empty"
        onConfirm={handleEmpty}
      />
    </div>
  );
}
