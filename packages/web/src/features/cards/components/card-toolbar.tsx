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
import { CardFilterPopover } from "@/features/cards/components/card-filter-popover";
import type { CardToolbarProps } from "@/features/cards/types";
import { IconDownload, IconLoader2, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

export function CardToolbar({
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
  onExport,
  onExportAndDelete,
  collectionName,
  onClearAll,
  hasCards,
  activeFilters,
  onFiltersChange,
  activeFilterCount,
}: CardToolbarProps) {
  const [isClearing, setIsClearing] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleExportOnly = () => {
    onExport();
    setExportDialogOpen(false);
  };

  const handleExportAndDelete = async () => {
    onExport();
    if (onExportAndDelete) {
      setIsDeleting(true);
      try {
        await onExportAndDelete();
      } finally {
        setIsDeleting(false);
        setExportDialogOpen(false);
      }
    }
  };

  const handleExportClick = () => {
    if (onExportAndDelete) {
      setExportDialogOpen(true);
    } else {
      onExport();
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
      <CardFilterPopover
        activeFilters={activeFilters}
        onFiltersChange={onFiltersChange}
        activeFilterCount={activeFilterCount}
      />
      <ButtonGroup>
        <DynamicDialog
          open={exportDialogOpen}
          onOpenChange={setExportDialogOpen}
          title="Export Collection"
          description={
            collectionName
              ? `Export "${collectionName}" to Manabox CSV. Would you also like to delete the collection afterwards?`
              : "Export cards to Manabox CSV. Would you also like to delete the collection afterwards?"
          }
          trigger={
            <Button
              variant="outline"
              size="icon"
              onClick={handleExportClick}
              disabled={!hasCards}
              className="shrink-0"
            >
              <IconDownload className="size-4" />
            </Button>
          }
          footer={
            <>
              <Button
                variant="outline"
                onClick={handleExportOnly}
                disabled={isDeleting}
              >
                Export Only
              </Button>
              <Button
                variant="destructive"
                onClick={handleExportAndDelete}
                disabled={isDeleting}
              >
                {isDeleting && <IconLoader2 className="size-4 animate-spin" />}
                Export & Delete
              </Button>
            </>
          }
          footerClassName="flex-col-reverse md:flex-row"
        />
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
