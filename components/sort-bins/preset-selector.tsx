"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
import { useBinConfigs } from "@/hooks/use-bin-configs";
import {
  IconDeviceFloppy,
  IconDotsVertical,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";

export function PresetSelector() {
  const { sets, activateSet, createSet, saveSet, deleteSet } =
    useBinConfigs();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [newSetName, setNewSetName] = useState("");

  const handleSave = useCallback(async () => {
    if (!presetName.trim()) return;
    await saveSet(presetName.trim());
    setPresetName("");
    setSaveDialogOpen(false);
  }, [presetName, saveSet]);

  const handleCreate = useCallback(async () => {
    if (!newSetName.trim()) return;
    await createSet(newSetName.trim());
    setNewSetName("");
    setCreateDialogOpen(false);
  }, [newSetName, createSet]);

  const handleDelete = useCallback(
    async (guid: string) => {
      await deleteSet(guid);
    },
    [deleteSet],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Sets</span>
        <div className="flex gap-1">
          <DynamicDialog
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            title="New Set"
            description="Create a new set with 7 empty bins."
            trigger={
              <Button variant="ghost" size="icon">
                <IconPlus className="size-3.5" />
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
                <Button
                  onClick={handleCreate}
                  disabled={!newSetName.trim()}
                >
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
          <DynamicDialog
            open={saveDialogOpen}
            onOpenChange={setSaveDialogOpen}
            title="Save as Set"
            description="Save the current bin configuration as a new set."
            trigger={
              <Button variant="ghost" size="icon">
                <IconDeviceFloppy className="size-3.5" />
              </Button>
            }
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={!presetName.trim()}>
                  Save
                </Button>
              </>
            }
            footerClassName="flex-col-reverse md:flex-row"
          >
            <Input
              placeholder="Set name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
              }}
              autoFocus
            />
          </DynamicDialog>
        </div>
      </div>

      {sets.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No sets</p>
      ) : (
        <div className="flex flex-col gap-1">
          {sets.map((set) => (
            <div key={set.guid} className="flex flex-row gap-1">
              <Button
                className="flex-1 justify-start"
                variant={set.isActive ? "default" : "outline"}
                onClick={() => activateSet(set.guid)}
              >
                {set.name}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button variant="ghost" size="icon">
                      <IconDotsVertical />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDelete(set.guid)}>
                    <IconTrash className="size-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
