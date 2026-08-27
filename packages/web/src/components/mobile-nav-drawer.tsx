import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { IconMenu2 } from "@tabler/icons-react";
import { useState, type ReactNode } from "react";

interface MobileNavDrawerProps {
  label: string;
  children: ReactNode;
}

export function MobileNavDrawer({ label, children }: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer direction="top" open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={label}
        >
          <IconMenu2 className="size-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="md:hidden">
        <DrawerTitle className="sr-only">{label}</DrawerTitle>
        <nav
          className="flex flex-col gap-1 p-4 text-sm font-medium"
          onClick={() => setOpen(false)}
        >
          {children}
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
