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
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { useState } from "react";
import type { CardToolbarProps } from "../types";

export function CardToolbar({
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
  onExport,
  onClearAll,
  hasCards,
}: CardToolbarProps) {
  const [isClearing, setIsClearing] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await onClearAll();
    } catch (error) {
      console.error("Failed to clear cards:", error);
    } finally {
      setIsClearing(false);
      setClearAllDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-row gap-2 items-center w-full">
      <Input
        placeholder="Search by name, set, type..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <Select value={sortKey} onValueChange={onSortChange}>
        <SelectTrigger className="w-full sm:w-64">
          <SelectValue placeholder="Sort by..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="scan-desc">Scan Order</SelectItem>
          <SelectItem value="name-asc">Name (A-Z)</SelectItem>
          <SelectItem value="name-desc">Name (Z-A)</SelectItem>
          <SelectItem value="set-asc">Set (A-Z)</SelectItem>
          <SelectItem value="set-desc">Set (Z-A)</SelectItem>
          <SelectItem value="rarity-asc">Rarity (Low-High)</SelectItem>
          <SelectItem value="rarity-desc">Rarity (High-Low)</SelectItem>
          <SelectItem value="price-asc">Price (Low-High)</SelectItem>
          <SelectItem value="price-desc">Price (High-Low)</SelectItem>
          <SelectItem value="cmc-asc">Mana Value (Low-High)</SelectItem>
          <SelectItem value="cmc-desc">Mana Value (High-Low)</SelectItem>
          <SelectItem value="edhrec-asc">Rank (Best First)</SelectItem>
          <SelectItem value="edhrec-desc">Rank (Worst First)</SelectItem>
        </SelectContent>
      </Select>
      <ButtonGroup>
        <Button
          variant="outline"
          size="icon"
          onClick={onExport}
          disabled={!hasCards}
          className="shrink-0"
        >
          <IconDownload className="size-4" />
        </Button>
        <DynamicDialog
          open={clearAllDialogOpen}
          onOpenChange={setClearAllDialogOpen}
          title="Delete Scanned Cards"
          description={`This will permanently delete all cards from your collection. This action cannot be undone.`}
          trigger={
            <Button variant="outline" size="icon" title="Clear all cards">
              <IconTrash className="size-4" />
            </Button>
          }
          footer={
            <>
              <Button
                variant="outline"
                onClick={() => setClearAllDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleClear}
                disabled={isClearing}
              >
                {isClearing ? "Clearing..." : "Clear All"}
              </Button>
            </>
          }
          footerClassName="flex-col-reverse md:flex-row"
        />
      </ButtonGroup>
    </div>
  );
}
