"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { DynamicDialog } from "@/components/ui/responsive-dialog";
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
        <DynamicDialog
          open={saveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          title="Save Preset"
          description="Save the current bin configuration as a reusable preset."
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
              <Button onClick={handleSaveNew} disabled={!presetName.trim()}>
                Save
              </Button>
            </>
          }
          footerClassName="flex-col-reverse md:flex-row"
        >
          <Input
            placeholder="Preset name..."
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveNew();
            }}
            autoFocus
          />
        </DynamicDialog>
      </div>

      {presets.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">No saved presets</p>
      ) : (
        <div className="flex flex-col gap-1">
          {presets.map((preset) => (
            <div key={preset.id} className="flex flex-row gap-1">
              <Button
                className="flex-1 justify-start"
                variant="outline"
                onClick={() => handleLoad(preset.id)}
              >
                {preset.name}
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
