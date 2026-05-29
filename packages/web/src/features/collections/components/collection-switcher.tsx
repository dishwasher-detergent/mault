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
import { collectionsQueryOptions, releaseScanLock } from "@/features/collections/api/collections";
import { useCollectionLocks } from "@/features/collections/api/use-collection-locks";
import { useCollections } from "@/features/collections/api/use-collections";
import { toast } from "sonner";
import {
  createCollectionSchema,
  type CreateCollectionFormValues,
} from "@/schemas/collections.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconEdit, IconLock, IconLockOpen, IconLoader2, IconPlus, IconShare } from "@tabler/icons-react";
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
  const { locks, currentUserId, isLockedByOther } = useCollectionLocks();
  const [createOpen, setCreateOpen] = useState(false);
  const [releasing, setReleasing] = useState(false);

  const isLockedByMe = !!(
    activeCollection &&
    locks[activeCollection.guid] &&
    locks[activeCollection.guid].userId === currentUserId
  );

  const handleReleaseLock = useCallback(async () => {
    if (!activeCollection) return;
    setReleasing(true);
    try {
      await releaseScanLock(activeCollection.guid);
      toast.success("Session released");
    } catch {
      toast.error("Failed to release session");
    } finally {
      setReleasing(false);
    }
  }, [activeCollection]);

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

  const handleShare = useCallback(() => {
    if (!activeCollection) return;
    const url = `${window.location.origin}/app/monitor/${activeCollection.guid}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Monitor link copied", { description: "Share this link with org members to let them watch the session." });
    }).catch(() => {
      toast.error("Could not copy link", { description: url });
    });
  }, [activeCollection]);

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
                {activeCollection && isLockedByOther(activeCollection.guid) && (
                  <IconLock size={11} className="shrink-0 text-amber-500" />
                )}
                <span className="truncate">
                  {activeCollection?.name ?? "No collection"}
                </span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {collections.map((c) => {
              const lockedByOther = isLockedByOther(c.guid);
              return (
                <SelectItem key={c.guid} value={c.guid} disabled={lockedByOther}>
                  <span className="truncate">{c.name}</span>
                  {lockedByOther && (
                    <IconLock size={11} className="ml-1 shrink-0 text-muted-foreground" />
                  )}
                  <span className="ml-auto pl-2 text-xs text-muted-foreground tabular-nums">
                    {c.cardCount}
                  </span>
                </SelectItem>
              );
            })}
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

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                disabled={!activeCollection}
                onClick={handleShare}
              >
                <IconShare />
              </Button>
            }
          />
          <TooltipContent>Copy monitor link</TooltipContent>
        </Tooltip>

        {isLockedByMe && (
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  disabled={releasing}
                  onClick={handleReleaseLock}
                  className="text-amber-500 border-amber-500/40 hover:bg-amber-500/10"
                >
                  {releasing ? <IconLoader2 className="animate-spin" /> : <IconLockOpen />}
                </Button>
              }
            />
            <TooltipContent>Give up session</TooltipContent>
          </Tooltip>
        )}

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
