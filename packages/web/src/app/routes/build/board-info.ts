import type { BoardType } from "@/app/routes/build/use-board-type";

export interface BoardInfo {
  displayName: string;
  shortName: string;
  irPins: number[];
  hopperIrPin: number;
  logicVoltage: "5V" | "3.3V";
  usbCableName: string;
}

export const BOARD_INFO: Record<BoardType, BoardInfo> = {
  uno_r4: {
    displayName: "Arduino Uno R4 Minima",
    shortName: "Uno R4 Minima",
    irPins: [2, 3, 4, 6, 7],
    hopperIrPin: 5,
    logicVoltage: "5V",
    usbCableName: "USB-A-to-USB-C cable",
  },
  esp32: {
    displayName: "ESP32-S3-WROOM-1",
    shortName: "ESP32-S3",
    irPins: [4, 5, 6, 7, 15],
    hopperIrPin: 16,
    logicVoltage: "3.3V",
    usbCableName: "USB-A-to-USB-C cable",
  },
};
