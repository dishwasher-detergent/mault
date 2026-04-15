import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardSelectDialog } from "@/features/cards/components/card-select-dialog";
import type { ScannedCardItemProps } from "@/features/cards/types";
import { cn } from "@/lib/utils";
import { IconCheck } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { memo } from "react";

export const ScannedCardItem = memo(function ScannedCardItem({
  card,
  scanId,
  onRemove,
  binNumber,
  isSelected = false,
  onToggleSelect,
  isNew = false,
}: ScannedCardItemProps) {
  return (
    <motion.div
      layout
      initial={
        isNew
          ? { opacity: 0, scale: 0.6, rotateY: -25, y: -20 }
          : { opacity: 0, scale: 0.95 }
      }
      animate={{ opacity: 1, scale: 1, rotateY: 0, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      transition={
        isNew
          ? { type: "spring", stiffness: 280, damping: 22, mass: 0.8 }
          : { duration: 0.18, ease: "easeOut" }
      }
      style={{ transformPerspective: 800 }}
      className={cn(
        "relative rounded-lg p-1 bg-muted border transition-shadow",
        isSelected && "ring-2 ring-primary ring-offset-1",
      )}
    >
      {isNew && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none z-40"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
          style={{
            background:
              "radial-gradient(ellipse at 50% 30%, oklch(0.85 0.18 80 / 0.55) 0%, oklch(0.7 0.22 45 / 0.3) 40%, transparent 70%)",
            boxShadow: "0 0 24px 4px oklch(0.8 0.2 70 / 0.5)",
          }}
        />
      )}
      <CardSelectDialog
        scanId={scanId}
        onRemove={onRemove}
        currentCard={card}
        trigger={
          <button type="button" className="w-full cursor-pointer">
            <div className="aspect-[2.5/3.5] rounded-lg overflow-hidden relative">
              <div className="absolute bottom-1 left-1 right-1 flex gap-1 items-center justify-between z-20">
                <Badge
                  variant={card.distance < 0.15 ? "default" : "destructive"}
                >
                  {card.distance != null
                    ? (100 - card.distance * 100).toFixed(2)
                    : "0.00"}
                  %
                </Badge>
                <Badge variant="secondary" className="shadow-md">
                  Bin {binNumber}
                </Badge>
              </div>
              <img
                src={card.image_uris?.normal || ""}
                alt={card.name}
                className="w-full h-full object-cover"
              />
            </div>
          </button>
        }
      />
      {onToggleSelect && (
        <Button
          size="icon-sm"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect();
          }}
          variant={isSelected ? "default" : "secondary"}
          className="absolute top-2 right-2 z-30"
        >
          <IconCheck />
        </Button>
      )}
      <div className="flex flex-row justify-between items-center pb-1">
        <div className="px-1 flex flex-row items-center gap-2">
          <div
            className="bg-common size-3 rounded-full"
            style={{ backgroundColor: `var(--${card.rarity})` }}
          />
          <p className="text-xs font-semibold uppercase" title={card.set}>
            {card.set}
          </p>
          <p className="text-xs text-muted-foreground">
            #{card.collector_number}
          </p>
        </div>
      </div>
    </motion.div>
  );
});
