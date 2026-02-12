"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconDownload, IconTrash } from "@tabler/icons-react";
import { useState } from "react";

interface CardToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortKey: string | null;
  onSortChange: (key: string | null) => void;
  onExport: () => void;
  onClearAll: () => void;
  hasCards: boolean;
}

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
    <div className="flex flex-row gap-2 items-center w-full sticky top-0 z-10 bg-background p-2 border-b">
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
      <Button
        variant="secondary"
        size="icon"
        onClick={onExport}
        disabled={!hasCards}
        className="shrink-0"
      >
        <IconDownload className="size-4" />
      </Button>
      <AlertDialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
      >
        <AlertDialogTrigger
          render={
            <Button variant="secondary" size="icon" title="Clear all cards">
              <IconTrash className="size-4" />
            </Button>
          }
        ></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all scanned cards?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all cards from your collection. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleClear} disabled={isClearing}>
              {isClearing ? "Clearing..." : "Clear All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
