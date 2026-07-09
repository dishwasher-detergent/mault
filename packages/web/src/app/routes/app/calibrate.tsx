import { AuditDrawer, type AuditEntry } from "@/components/audit-drawer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  feederQueryOptions,
  getFeederHistory,
  revertFeederConfig,
  type FeederConfigAuditEntry,
} from "@/features/calibration/api/feeder-config";
import {
  getModuleHistory,
  modulesQueryOptions,
  revertModuleConfig,
  type ModuleConfigAuditEntry,
} from "@/features/calibration/api/module-configs";
import { useCalibrationPage } from "@/features/calibration/api/use-calibration-page";
import { BinRoutingControls } from "@/features/calibration/components/bin-routing-controls";
import { FeederCalibrationPanel } from "@/features/calibration/components/feeder-calibration-panel";
import { IrSensorPanel } from "@/features/calibration/components/ir-sensor-panel";
import { LedControls } from "@/features/calibration/components/led-controls";
import { ModuleCalibrationGrid } from "@/features/calibration/components/module-calibration-grid";
import { IconClockHour3, IconDeviceUsb, IconDeviceUsbFilled } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";

function ModuleHistoryBody({ entry }: { entry: ModuleConfigAuditEntry }) {
  const { calibration: c } = entry;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex gap-2">
        <span className="w-16 shrink-0 text-muted-foreground">Bottom</span>
        <span>{c.bottomClosed} / {c.bottomOpen}</span>
      </div>
      <div className="flex gap-2">
        <span className="w-16 shrink-0 text-muted-foreground">Paddle</span>
        <span>{c.paddleClosed} / {c.paddleOpen}</span>
      </div>
      <div className="flex gap-2">
        <span className="w-16 shrink-0 text-muted-foreground">Pusher</span>
        <span>{c.pusherLeft} / {c.pusherNeutral} / {c.pusherRight}</span>
      </div>
    </div>
  );
}

function FeederHistoryBody({ entry }: { entry: FeederConfigAuditEntry }) {
  const { calibration: c } = entry;
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
      <span className="text-muted-foreground">Speed</span><span>{c.speed}</span>
      <span className="text-muted-foreground">Duration</span><span>{c.duration}ms</span>
      <span className="text-muted-foreground">Pulse</span><span>{c.pulseDuration <= 0 ? "Continuous" : `${c.pulseDuration}ms`}</span>
      <span className="text-muted-foreground">Pause</span><span>{c.pauseDuration}ms</span>
      <span className="text-muted-foreground">Settle</span><span>{c.settleDuration}ms</span>
    </div>
  );
}

export default function CalibratePage() {
  const queryClient = useQueryClient();
  const [moduleHistoryOpen, setModuleHistoryOpen] = useState(false);
  const [feederHistoryOpen, setFeederHistoryOpen] = useState(false);

  const { data: moduleHistoryResult, isLoading: moduleHistoryLoading } = useQuery({
    queryKey: ["modules", "history"],
    queryFn: getModuleHistory,
    enabled: moduleHistoryOpen,
    staleTime: 0,
  });

  const { data: feederHistoryResult, isLoading: feederHistoryLoading } = useQuery({
    queryKey: ["feeder", "history"],
    queryFn: getFeederHistory,
    enabled: feederHistoryOpen,
    staleTime: 0,
  });

  const revertModuleMutation = useMutation({
    mutationFn: revertModuleConfig,
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(modulesQueryOptions.queryKey, result.data);
        queryClient.invalidateQueries({ queryKey: ["modules", "history"] });
        setModuleHistoryOpen(false);
        toast.success("Reverted module calibration");
      }
    },
    onError: () => toast.error("Failed to revert"),
  });

  const revertFeederMutation = useMutation({
    mutationFn: revertFeederConfig,
    onSuccess: (result) => {
      if (result.success && result.data) {
        queryClient.setQueryData(feederQueryOptions.queryKey, result.data);
        queryClient.invalidateQueries({ queryKey: ["feeder", "history"] });
        setFeederHistoryOpen(false);
        toast.success("Reverted feeder calibration");
      }
    },
    onError: () => toast.error("Failed to revert"),
  });

  const moduleHistoryEntries = useMemo((): AuditEntry[] => {
    return (moduleHistoryResult?.data ?? []).map((entry: ModuleConfigAuditEntry) => ({
      guid: entry.guid,
      createdAt: entry.createdAt,
      label: `Module ${entry.moduleNumber}`,
      body: <ModuleHistoryBody entry={entry} />,
    }));
  }, [moduleHistoryResult]);

  const feederHistoryEntries = useMemo((): AuditEntry[] => {
    return (feederHistoryResult?.data ?? []).map((entry: FeederConfigAuditEntry) => ({
      guid: entry.guid,
      createdAt: entry.createdAt,
      body: <FeederHistoryBody entry={entry} />,
    }));
  }, [feederHistoryResult]);

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
    isUnconfigured,
    handleControl,
    handleReset,
    handleSliderChange,
    handleLedToggle,
    handleTest,
    handleTestBin,
    handleCenterModule,
    handleSetPosition,
    feederConfig,
    feederSpeedValue,
    feederDurationValue,
    feederPulseDurationValue,
    feederPauseDurationValue,
    feederSettleDurationValue,
    handleFeederSpeedChange,
    handleFeederDurationChange,
    handleFeederPulseDurationChange,
    handleFeederPauseDurationChange,
    handleFeederSettleDurationChange,
    handleFeederSetSpeed,
    handleFeederSetDuration,
    handleFeederSetPulseDuration,
    handleFeederSetPauseDuration,
    handleFeederSetSettleDuration,
    handleFeed,
    isSampleRunning,
    handleSampleRun,
    irStates,
    hopperHasCards,
    irMonitoring,
    handleReadIR,
    handleToggleIrMonitor,
  } = useCalibrationPage();

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      <div className="flex flex-wrap items-center gap-2">
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
          disabled={!isConnected || isTesting || isUnconfigured}
          onClick={handleTest}
        >
          {isTesting ? "Testing…" : "Run Test"}
        </Button>
        {isUnconfigured && (
          <span className="text-xs text-muted-foreground">
            Calibrate all modules before running the test
          </span>
        )}
      </div>

      <LedControls
        ledStates={ledStates}
        isConnected={isConnected}
        onToggle={handleLedToggle}
      />

      <IrSensorPanel
        irStates={irStates}
        hopperHasCards={hopperHasCards}
        isConnected={isConnected}
        isMonitoring={irMonitoring}
        onRead={handleReadIR}
        onToggleMonitor={handleToggleIrMonitor}
      />

      <BinRoutingControls
        activeBin={activeBin}
        isConnected={isConnected}
        isSampleRunning={isSampleRunning}
        onTestBin={handleTestBin}
        onFeed={handleFeed}
        onSampleRun={handleSampleRun}
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Feeder Calibration</Label>
          <button
            type="button"
            onClick={() => setFeederHistoryOpen(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconClockHour3 size={12} />
            History
          </button>
        </div>
        <FeederCalibrationPanel
          speedValue={feederSpeedValue}
          durationValue={feederDurationValue}
          pulseDurationValue={feederPulseDurationValue}
          pauseDurationValue={feederPauseDurationValue}
          settleDurationValue={feederSettleDurationValue}
          calibration={feederConfig}
          isLoading={isLoading}
          isConnected={isConnected}
          onSpeedChange={handleFeederSpeedChange}
          onDurationChange={handleFeederDurationChange}
          onPulseDurationChange={handleFeederPulseDurationChange}
          onPauseDurationChange={handleFeederPauseDurationChange}
          onSettleDurationChange={handleFeederSettleDurationChange}
          onSetSpeed={handleFeederSetSpeed}
          onSetDuration={handleFeederSetDuration}
          onSetPulseDuration={handleFeederSetPulseDuration}
          onSetPauseDuration={handleFeederSetPauseDuration}
          onSetSettleDuration={handleFeederSetSettleDuration}
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label>Module Calibration</Label>
          <button
            type="button"
            onClick={() => setModuleHistoryOpen(true)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <IconClockHour3 size={12} />
            History
          </button>
        </div>
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

      <AuditDrawer
        open={feederHistoryOpen}
        onOpenChange={setFeederHistoryOpen}
        title="Feeder History"
        entries={feederHistoryEntries}
        isLoading={feederHistoryLoading}
        onRevert={(guid) => revertFeederMutation.mutate(guid)}
        isReverting={revertFeederMutation.isPending}
      />

      <AuditDrawer
        open={moduleHistoryOpen}
        onOpenChange={setModuleHistoryOpen}
        title="Module History"
        entries={moduleHistoryEntries}
        isLoading={moduleHistoryLoading}
        onRevert={(guid) => revertModuleMutation.mutate(guid)}
        isReverting={revertModuleMutation.isPending}
      />
    </div>
  );
}
