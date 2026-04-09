import {
  activateCollection as activateCollectionFn,
  collectionsQueryOptions,
  createCollection as createCollectionFn,
  deleteCollection as deleteCollectionFn,
  renameCollection as renameCollectionFn,
} from "@/features/collections/api/collections";
import type { Collection } from "@magic-vault/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { toast } from "sonner";

interface CollectionsContextValue {
  collections: Collection[];
  activeCollection: Collection | null;
  isLoading: boolean;
  isActivating: boolean;
  isMutating: boolean;
  createCollection: (name: string) => Promise<void>;
  renameCollection: (guid: string, name: string) => Promise<void>;
  activateCollection: (guid: string) => Promise<void>;
  deleteCollection: (guid: string) => Promise<void>;
}

const CollectionsContext = createContext<CollectionsContextValue | null>(null);

export function CollectionsProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const { data: collections = [], isLoading } = useQuery(collectionsQueryOptions);

  const activeCollection = useMemo(
    () => collections.find((c) => c.isActive) ?? null,
    [collections],
  );

  function setCollections(data: Collection[]) {
    queryClient.setQueryData(["collections"], data);
  }

  const createMutation = useMutation({
    mutationFn: createCollectionFn,
    onSuccess: (r) => { if (r.success && r.data) setCollections(r.data); },
    onError: () => toast.error("Failed to create collection"),
  });

  const renameMutation = useMutation({
    mutationFn: ({ guid, name }: { guid: string; name: string }) =>
      renameCollectionFn(guid, name),
    onSuccess: (r) => { if (r.success && r.data) setCollections(r.data); },
    onError: () => toast.error("Failed to rename collection"),
  });

  const activateMutation = useMutation({
    mutationFn: activateCollectionFn,
    onSuccess: (r) => { if (r.success && r.data) setCollections(r.data); },
    onError: () => toast.error("Failed to switch collection"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCollectionFn,
    onSuccess: (r) => { if (r.success && r.data) setCollections(r.data); },
    onError: () => toast.error("Failed to delete collection"),
  });

  const isMutating =
    createMutation.isPending ||
    renameMutation.isPending ||
    activateMutation.isPending ||
    deleteMutation.isPending;

  const create = useCallback(
    async (name: string) => { await createMutation.mutateAsync(name); },
    [createMutation],
  );

  const rename = useCallback(
    async (guid: string, name: string) => {
      await renameMutation.mutateAsync({ guid, name });
    },
    [renameMutation],
  );

  const activate = useCallback(
    async (guid: string) => { await activateMutation.mutateAsync(guid); },
    [activateMutation],
  );

  const remove = useCallback(
    async (guid: string) => { await deleteMutation.mutateAsync(guid); },
    [deleteMutation],
  );

  return (
    <CollectionsContext
      value={{
        collections,
        activeCollection,
        isLoading,
        isActivating: activateMutation.isPending,
        isMutating,
        createCollection: create,
        renameCollection: rename,
        activateCollection: activate,
        deleteCollection: remove,
      }}
    >
      {children}
    </CollectionsContext>
  );
}

export function useCollections() {
  const context = useContext(CollectionsContext);
  if (!context) {
    throw new Error("useCollections must be used within a CollectionsProvider");
  }
  return context;
}
