import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { cn } from "@/lib/utils";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

const DialogCloseContext = createContext<() => void>(() => {});

export function useDialogClose() {
  return useContext(DialogCloseContext);
}

interface DynamicDialogProps {
  trigger?: React.ReactElement;
  title: ReactNode;
  description?: ReactNode;
  footer?: ReactNode;
  footerClassName?: string;
  children?: ReactNode;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

export function DynamicDialog({
  trigger,
  title,
  description,
  footer,
  footerClassName,
  children,
  className,
  open: controlledOpen,
  onOpenChange,
  onClose,
}: DynamicDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isControlled) setUncontrolledOpen(isOpen);
      onOpenChange?.(isOpen);
      if (!isOpen) onClose?.();
    },
    [isControlled, onOpenChange, onClose],
  );

  const close = useCallback(() => handleOpenChange(false), [handleOpenChange]);

  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DialogCloseContext value={close}>
        <Drawer open={open} onOpenChange={handleOpenChange}>
          {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
          <DrawerContent className={className}>
            <DrawerHeader className="py-0">
              <DrawerTitle className="text-start">{title}</DrawerTitle>
              {description && (
                <DrawerDescription className="text-start">
                  {description}
                </DrawerDescription>
              )}
            </DrawerHeader>
            <div className="p-4 pt-0 flex flex-col gap-2">{children}</div>
            {footer && (
              <DrawerFooter className={cn("pt-0", footerClassName)}>
                {footer}
              </DrawerFooter>
            )}
          </DrawerContent>
        </Drawer>
      </DialogCloseContext>
    );
  }

  return (
    <DialogCloseContext value={close}>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger render={trigger}></DialogTrigger>}
        <DialogContent className={className}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
          <div className="flex flex-col gap-2">{children}</div>
          {footer && (
            <DialogFooter className={footerClassName}>{footer}</DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </DialogCloseContext>
  );
}
