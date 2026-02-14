"use client";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
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
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useCallback, useState } from "react";

export function PresetSelector() {
  const { sets, activateSet, createSet, deleteSet } = useBinConfigs();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [newSetName, setNewSetName] = useState("");

  const activeSet = sets.find((s) => s.isActive);

  const handleCreate = useCallback(async () => {
    if (!newSetName.trim()) return;
    await createSet(newSetName.trim());
    setNewSetName("");
    setCreateDialogOpen(false);
  }, [newSetName, createSet]);

  const handleDelete = useCallback(async () => {
    if (!activeSet) return;
    await deleteSet(activeSet.guid);
    setDeleteDialogOpen(false);
  }, [activeSet, deleteSet]);

  return (
    <ButtonGroup className="w-full">
      <Select
        value={activeSet?.guid}
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
        onOpenChange={setCreateDialogOpen}
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
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newSetName.trim()}>
              Create
            </Button>
          </>
        }
        footerClassName="flex-col-reverse md:flex-row"
      >
        <Input
          placeholder="Set name..."
          value={newSetName}
          onChange={(e) => setNewSetName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
          autoFocus
        />
      </DynamicDialog>
    </ButtonGroup>
  );
}
