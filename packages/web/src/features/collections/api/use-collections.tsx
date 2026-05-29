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
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";

const ACTIVE_KEY = "activeCollectionGuid";

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

  const [activeGuid, setActiveGuidState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY),
  );

  const setActiveGuid = useCallback((guid: string | null) => {
    setActiveGuidState(guid);
    if (guid) localStorage.setItem(ACTIVE_KEY, guid);
    else localStorage.removeItem(ACTIVE_KEY);
  }, []);

  // If the stored guid no longer exists (e.g. collection deleted), clear it
  useEffect(() => {
    if (activeGuid && collections.length > 0 && !collections.find((c) => c.guid === activeGuid)) {
      setActiveGuid(null);
    }
  }, [collections, activeGuid, setActiveGuid]);

  const activeCollection = useMemo(() => {
    if (activeGuid) {
      const found = collections.find((c) => c.guid === activeGuid);
      if (found) return found;
    }
    // First load or no stored preference — fall back to most recently updated
    return collections[0] ?? null;
  }, [collections, activeGuid]);

  function setCollections(data: Collection[]) {
    queryClient.setQueryData(["collections"], data);
  }

  const createMutation = useMutation({
    mutationFn: createCollectionFn,
    onSuccess: (r) => {
      if (r.success && r.data) {
        setCollections(r.data);
        // Activate the newly created collection locally
        const created = r.data.find((c) => c.isActive);
        if (created) setActiveGuid(created.guid);
      }
    },
    onError: () => toast.error("Failed to create collection"),
  });

  const renameMutation = useMutation({
    mutationFn: ({ guid, name }: { guid: string; name: string }) =>
      renameCollectionFn(guid, name),
    onSuccess: (r) => { if (r.success && r.data) setCollections(r.data); },
    onError: () => toast.error("Failed to rename collection"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCollectionFn,
    onSuccess: (r) => { if (r.success && r.data) setCollections(r.data); },
    onError: () => toast.error("Failed to delete collection"),
  });

  const isMutating =
    createMutation.isPending ||
    renameMutation.isPending ||
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

  // Switching is purely local — just update localStorage
  const activate = useCallback(
    async (guid: string) => {
      setActiveGuid(guid);
      // Fire-and-forget to server so the org has a "last used" hint for new devices
      activateCollectionFn(guid).catch(() => {});
    },
    [setActiveGuid],
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
        isActivating: false,
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
