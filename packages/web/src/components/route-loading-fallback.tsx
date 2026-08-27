import { IconLoader2 } from "@tabler/icons-react";

export function RouteLoadingFallback() {
  return (
    <div className="flex h-dvh w-dvw items-center justify-center bg-background">
      <IconLoader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
