import type { ReactElement } from "react";
import type { ScryfallCardWithDistance } from "@magic-vault/shared";

export interface CardSelectDialogProps {
  trigger?: ReactElement;
  title?: string;
  description?: string;
  scanId?: string;
  onRemove?: () => void;
  currentCard?: ScryfallCardWithDistance;
  alternativeMatches?: ScryfallCardWithDistance[];
  capturedImageUrl?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export interface CardFilters {
  colors: string[];
  rarities: string[];
  bins: Array<number | null>;
  needsAttention: boolean;
}

export interface CardToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortKey: string | null;
  onSortChange: (key: string | null) => void;
  onExport?: () => void;
  collectionName?: string;
  onClearAll?: () => void;
  hasCards: boolean;
  activeFilters: CardFilters;
  onFiltersChange: (filters: CardFilters) => void;
  activeFilterCount: number;
  watchers?: { userId: string; displayName: string }[];
}

export interface ScannedCardItemProps {
  card: ScryfallCardWithDistance;
  onOpen: () => void;
  binNumber?: number;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  isNew?: boolean;
  hasAlternatives?: boolean;
}
