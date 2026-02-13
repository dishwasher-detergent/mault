"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useBinConfigs } from "@/hooks/use-bin-configs";
import { BinPreset } from "@/interfaces/sort-bins.interface";
import {
  IconDeviceFloppy,
  IconDotsVertical,
  IconDownload,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useState } from "react";

export function PresetSelector() {
  const { presets, saveAsPreset, updatePreset, loadPreset, deletePreset } =
    useBinConfigs();
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");

  const handleSaveNew = useCallback(async () => {
    if (!presetName.trim()) return;
    await saveAsPreset(presetName.trim());
    setPresetName("");
    setSaveDialogOpen(false);
  }, [presetName, saveAsPreset]);

  const handleLoad = useCallback(
    async (presetId: number) => {
      await loadPreset(presetId);
    },
    [loadPreset],
  );

  const handleOverwrite = useCallback(
    async (preset: BinPreset) => {
      await updatePreset(preset.id, preset.name);
    },
    [updatePreset],
  );

  const handleDelete = useCallback(
    async (presetId: number) => {
      await deletePreset(presetId);
    },
    [deletePreset],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">
          Presets
        </span>
        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger
            render={
              <Button variant="ghost" size="icon-xs" title="Save as preset">
                <IconDeviceFloppy className="size-3.5" />
              </Button>
            }
          />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Preset</DialogTitle>
              <DialogDescription>
                Save the current bin configuration as a reusable preset.
              </DialogDescription>
            </DialogHeader>
            <Input
              placeholder="Preset name..."
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveNew();
              }}
              autoFocus
            />
            <DialogFooter>
              <DialogClose render={<Button variant="outline">Cancel</Button>} />
              <Button onClick={handleSaveNew} disabled={!presetName.trim()}>
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {presets.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No saved presets</p>
      ) : (
        <div className="flex flex-col gap-1">
          {presets.map((preset) => (
            <div
              key={preset.id}
              className="group flex items-center gap-1 rounded-md border px-2.5 py-1.5"
            >
              <button
                type="button"
                className="flex-1 text-left text-xs font-medium truncate hover:underline cursor-pointer"
                onClick={() => handleLoad(preset.id)}
                title="Load this preset"
              >
                {preset.name}
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <IconDotsVertical className="size-3" />
                    </Button>
                  }
                />
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleLoad(preset.id)}>
                    <IconDownload className="size-3.5" />
                    Load
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOverwrite(preset)}>
                    <IconDeviceFloppy className="size-3.5" />
                    Overwrite
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleDelete(preset.id)}>
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
