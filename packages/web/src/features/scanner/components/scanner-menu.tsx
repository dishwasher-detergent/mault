import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ZoomRange } from "@/features/scanner/types";
import {
  IconAdjustments,
  IconCamera,
  IconDeviceUsb,
  IconDeviceUsbFilled,
} from "@tabler/icons-react";

interface ScannerMenuProps {
  isCameraActive: boolean;
  isConnected: boolean;
  zoom: number;
  zoomRange: ZoomRange | null;
  onCameraConnect: () => void;
  onCameraDisconnect: () => void;
  onZoomChange: (value: number) => void;
  onScannerConnect: () => void;
  onScannerDisconnect: () => void;
  onScannerRetry: () => void;
  onCalibrate: () => void;
}

export function ScannerMenu({
  isCameraActive,
  isConnected,
  zoom,
  zoomRange,
  onCameraConnect,
  onCameraDisconnect,
  onZoomChange,
  onScannerConnect,
  onScannerDisconnect,
  onScannerRetry,
  onCalibrate,
}: ScannerMenuProps) {
  return (
    <div className="absolute top-2 right-2 z-40">
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="icon" variant="secondary" />}>
          <IconAdjustments size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <IconCamera />
              Camera
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {isCameraActive ? (
                <>
                  <DropdownMenuItem onClick={onCameraConnect}>
                    Reconnect
                  </DropdownMenuItem>
                  {zoomRange && (
                    <>
                      <DropdownMenuSeparator />
                      <div
                        className="px-2 py-1.5 flex flex-col gap-1"
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <p className="text-xs text-muted-foreground">Zoom</p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4">{zoomRange.min}</span>
                          <input
                            type="range"
                            min={zoomRange.min}
                            max={zoomRange.max}
                            step={zoomRange.step}
                            value={zoom}
                            onChange={(e) => onZoomChange(Number(e.target.value))}
                            className="flex-1 cursor-pointer accent-foreground"
                          />
                          <span className="text-xs text-muted-foreground w-4">{zoomRange.max}</span>
                        </div>
                      </div>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={onCameraDisconnect}>
                    Disconnect
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={onCameraConnect}>
                  Connect
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              {isConnected ? <IconDeviceUsbFilled /> : <IconDeviceUsb />}
              Scanner
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {isConnected ? (
                <>
                  <DropdownMenuItem onClick={onCalibrate}>
                    Calibrate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onScannerRetry}>
                    Retry Connection
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={onScannerDisconnect}>
                    Disconnect
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem onClick={onScannerConnect}>
                  Connect
                </DropdownMenuItem>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
