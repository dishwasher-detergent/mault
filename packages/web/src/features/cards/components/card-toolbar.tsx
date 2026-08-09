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
import { WatcherStack } from "@/components/ui/watcher-stack";
import { CardFilterPopover } from "@/features/cards/components/card-filter-popover";
import type { CardToolbarProps } from "@/features/cards/types";
import type { FieldMeta } from "@magic-vault/shared";
import { IconCheckbox, IconDownload, IconTrash } from "@tabler/icons-react";
import type { TFunction } from "i18next";
import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";

// Numeric/enum fields both have a defined "low to high" order (a numeric
// value, or a field's own `options` order); string fields sort
// alphabetically. See compareByField in use-card-filter-sort.ts.
function sortLabels(
  type: FieldMeta["type"],
  t: TFunction<"cards">,
): [asc: string, desc: string] {
  return type === "string"
    ? [t("cardToolbar.sortAscString"), t("cardToolbar.sortDescString")]
    : [t("cardToolbar.sortAscDefault"), t("cardToolbar.sortDescDefault")];
}

function sortValueLabel(
  sortKey: string | null,
  sortableFields: FieldMeta[],
  t: TFunction<"cards">,
): string {
  if (!sortKey || sortKey === "scan-desc") return t("cardToolbar.scanOrder");
  const i = sortKey.lastIndexOf("-");
  const field = sortKey.slice(0, i);
  const dir = sortKey.slice(i + 1);
  const meta = sortableFields.find((f) => f.field === field);
  if (!meta) return "";
  const [asc, desc] = sortLabels(meta.type, t);
  return `${meta.label} (${dir === "asc" ? asc : desc})`;
}

export function CardToolbar({
  searchQuery,
  onSearchChange,
  sortKey,
  onSortChange,
  sortableFields,
  onExport,
  onClearAll,
  hasCards,
  activeFilters,
  onFiltersChange,
  activeFilterCount,
  watchers,
  allSelected,
  onToggleSelectAll,
  availableRarities,
  availableColors,
}: CardToolbarProps) {
  const { t } = useTranslation("cards");
  const [isClearing, setIsClearing] = useState(false);
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);

  const handleClear = async () => {
    setIsClearing(true);
    try {
      await onClearAll?.();
    } catch (error) {
      console.error("Failed to clear cards:", error);
    } finally {
      setIsClearing(false);
      setClearAllDialogOpen(false);
    }
  };

  return (
    <div className="flex flex-row gap-2 items-center w-full">
      {watchers && watchers.length > 0 && <WatcherStack watchers={watchers} />}
      <Input
        placeholder={t("cardToolbar.searchPlaceholder")}
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1"
      />
      <Select value={sortKey} onValueChange={onSortChange}>
        <SelectTrigger className="w-full sm:w-64">
          <SelectValue placeholder={t("cardToolbar.sortPlaceholder")}>
            {sortValueLabel(sortKey, sortableFields, t)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="scan-desc">{t("cardToolbar.scanOrder")}</SelectItem>
          {sortableFields.map((field) => {
            const [asc, desc] = sortLabels(field.type, t);
            return (
              <Fragment key={field.field}>
                <SelectItem value={`${field.field}-asc`}>
                  {field.label} ({asc})
                </SelectItem>
                <SelectItem value={`${field.field}-desc`}>
                  {field.label} ({desc})
                </SelectItem>
              </Fragment>
            );
          })}
        </SelectContent>
      </Select>
      <CardFilterPopover
        activeFilters={activeFilters}
        onFiltersChange={onFiltersChange}
        activeFilterCount={activeFilterCount}
        availableRarities={availableRarities ?? []}
        availableColors={availableColors ?? []}
      />
      {onToggleSelectAll && (
        <Button
          variant="outline"
          size="icon"
          onClick={onToggleSelectAll}
          disabled={!hasCards}
          className="shrink-0"
          title={allSelected ? t("cardToolbar.deselectAll") : t("cardToolbar.selectAll")}
        >
          <IconCheckbox className="size-4" />
        </Button>
      )}
      {(onExport || onClearAll) && (
        <ButtonGroup>
          <Button
            variant="outline"
            size="icon"
            onClick={onExport}
            disabled={!hasCards}
            className="shrink-0"
            title={t("cardToolbar.sessionSummaryExport")}
          >
            <IconDownload className="size-4" />
          </Button>
          <DynamicDialog
            open={clearAllDialogOpen}
            onOpenChange={setClearAllDialogOpen}
            title={t("cardToolbar.deleteScannedCardsTitle")}
            description={t("cardToolbar.deleteScannedCardsDescription")}
            trigger={
              <Button variant="outline" size="icon" title={t("cardToolbar.clearAllCardsTitle")}>
                <IconTrash className="size-4" />
              </Button>
            }
            footer={
              <>
                <Button
                  variant="outline"
                  onClick={() => setClearAllDialogOpen(false)}
                >
                  {t("cardToolbar.cancel")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleClear}
                  disabled={isClearing}
                >
                  {isClearing ? t("cardToolbar.clearing") : t("cardToolbar.clearAll")}
                </Button>
              </>
            }
            footerClassName="flex-col-reverse md:flex-row"
          />
        </ButtonGroup>
      )}
    </div>
  );
}
