import type { ReactElement } from "react";
import type { ScryfallCardWithDistance } from "@magic-vault/shared";

export interface CardSelectDialogProps {
  trigger: ReactElement;
  title?: string;
  description?: string;
  scanId?: string;
  onRemove?: () => void;
  currentCard?: ScryfallCardWithDistance;
}

export interface CardToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortKey: string | null;
  onSortChange: (key: string | null) => void;
  onExport: () => void;
  onClearAll: () => void;
  hasCards: boolean;
}

export interface ScannedCardItemProps {
  card: ScryfallCardWithDistance;
  scanId: string;
  onRemove: () => void;
  binNumber?: number;
}
