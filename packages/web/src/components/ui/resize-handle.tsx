import { cn } from "@/lib/utils";

interface ResizeHandleProps {
  orientation: "vertical" | "horizontal";
  isDragging: boolean;
  onPointerDown: (e: React.PointerEvent) => void;
  className?: string;
}

export function ResizeHandle({
  orientation,
  isDragging,
  onPointerDown,
  className,
}: ResizeHandleProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation === "vertical" ? "vertical" : "horizontal"}
      onPointerDown={onPointerDown}
      className={cn(
        "shrink-0 relative z-10 touch-none select-none group",
        orientation === "vertical" ? "w-1.5 cursor-col-resize" : "h-1.5 cursor-row-resize",
        className,
      )}
    >
      <div
        className={cn(
          "absolute bg-border transition-colors group-hover:bg-primary/60",
          isDragging && "bg-primary/60",
          orientation === "vertical"
            ? "inset-y-0 left-1/2 w-px -translate-x-1/2"
            : "inset-x-0 top-1/2 h-px -translate-y-1/2",
        )}
      />
    </div>
  );
}
