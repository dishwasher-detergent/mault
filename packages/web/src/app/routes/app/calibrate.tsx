import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useCalibrationPage } from "@/features/calibration/api/use-calibration-page";
import { BinRoutingControls } from "@/features/calibration/components/bin-routing-controls";
import { LedControls } from "@/features/calibration/components/led-controls";
import { ModuleCalibrationGrid } from "@/features/calibration/components/module-calibration-grid";
import { IconDeviceUsb, IconDeviceUsbFilled } from "@tabler/icons-react";

export default function CalibratePage() {
  const {
    isConnected,
    connect,
    disconnect,
    configs,
    isLoading,
    active,
    sliderValues,
    ledStates,
    activeBin,
    isTesting,
    handleControl,
    handleReset,
    handleSliderChange,
    handleLedToggle,
    handleTest,
    handleTestBin,
    handleCenterModule,
    handleSetPosition,
  } = useCalibrationPage();

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex justify-start gap-2">
        {isConnected ? (
          <Button variant="outline" onClick={disconnect}>
            <IconDeviceUsbFilled />
            Disconnect
          </Button>
        ) : (
          <Button onClick={connect}>
            <IconDeviceUsb />
            Connect Device
          </Button>
        )}
        <Button
          variant="outline"
          disabled={!isConnected || isTesting}
          onClick={handleTest}
        >
          {isTesting ? "Testing…" : "Run Test"}
        </Button>
      </div>

      <LedControls
        ledStates={ledStates}
        isConnected={isConnected}
        onToggle={handleLedToggle}
      />

      <BinRoutingControls
        activeBin={activeBin}
        isConnected={isConnected}
        onTestBin={handleTestBin}
      />

      <div className="flex flex-col gap-2">
        <Label>Module Calibration</Label>
        <ModuleCalibrationGrid
          configs={configs}
          active={active}
          sliderValues={sliderValues}
          isLoading={isLoading}
          isConnected={isConnected}
          onControl={handleControl}
          onReset={handleReset}
          onSliderChange={handleSliderChange}
          onSetPosition={handleSetPosition}
          onCenter={handleCenterModule}
        />
      </div>
    </div>
  );
}
