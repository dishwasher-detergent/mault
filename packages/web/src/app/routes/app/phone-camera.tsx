import { Button } from "@/components/ui/button";
import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { orgSettingsQueryOptions } from "@/features/companies/api/org-settings";
import { useOrg } from "@/features/companies/api/use-organization";
import { usePhoneCameraBroadcast } from "@/features/scanner/api/use-phone-camera-broadcast";
import { useVideoCanvasPreview } from "@/features/scanner/api/use-video-canvas-preview";
import { DEFAULT_SCAN_REGION } from "@magic-vault/shared";
import {
  IconCircleCheck,
  IconLoader2,
  IconPlugOff,
  IconRefresh,
  IconVideoOff,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

export default function PhoneCameraPage() {
  const { t } = useTranslation("scanner");
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const { status, localStream, errorMessage, disconnect, reconnect } =
    usePhoneCameraBroadcast(collectionGuid);
  const { data: collections } = useQuery(collectionsQueryOptions);
  const collection = collections?.find((c) => c.guid === collectionGuid);
  const { activeOrg } = useOrg();
  const { data: orgSettingsData } = useQuery(
    orgSettingsQueryOptions(activeOrg?.id),
  );
  const scanRegion = orgSettingsData?.scanRegion ?? DEFAULT_SCAN_REGION;
  const { videoRef, displayCanvasRef, overlayCanvasRef } =
    useVideoCanvasPreview(localStream, scanRegion);

  const statusText: Record<typeof status, string> = {
    "requesting-camera": t("phoneCamera.requestingCamera"),
    "camera-error": t("phoneCamera.cameraError"),
    waiting: t("phoneCamera.waitingForDesktop"),
    connecting: t("phoneCamera.statusConnecting"),
    connected: t("phoneCamera.streamingConnected"),
    disconnected: t("phoneCamera.disconnected"),
  };

  if (status === "disconnected") {
    return (
      <div className="flex flex-col flex-1 min-h-0 items-center justify-center gap-4 bg-black text-white p-6 text-center">
        <IconPlugOff className="size-8 text-white/70" />
        <p className="text-sm font-medium">{statusText.disconnected}</p>
        <Button variant="secondary" onClick={reconnect}>
          <IconRefresh />
          {t("phoneCamera.reconnect")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 relative overflow-hidden bg-black">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={displayCanvasRef} className="absolute" />
      <canvas
        ref={overlayCanvasRef}
        className="absolute z-10 pointer-events-none"
      />
      <div className="absolute inset-x-0 top-0 p-4 flex items-center justify-between gap-2 bg-gradient-to-b from-black/70 to-transparent text-white">
        <p className="text-sm font-medium">
          {collection
            ? t("phoneCamera.streamingTo", { name: collection.name })
            : t("phoneCamera.dialogTitle")}
        </p>
        {status !== "camera-error" && (
          <Button
            variant="secondary"
            size="icon-sm"
            onClick={disconnect}
            title={t("phoneCamera.disconnectButton")}
          >
            <IconPlugOff />
          </Button>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-6 flex items-center justify-center px-4">
        <div className="flex items-center gap-2 rounded-full bg-black/70 backdrop-blur-sm px-3.5 py-2 text-white text-sm shadow-lg">
          {status === "connected" ? (
            <IconCircleCheck className="size-4 text-green-400 shrink-0" />
          ) : status === "camera-error" ? (
            <IconVideoOff className="size-4 text-destructive shrink-0" />
          ) : (
            <IconLoader2 className="size-4 animate-spin shrink-0" />
          )}
          <span>{statusText[status]}</span>
        </div>
      </div>
      {status === "camera-error" && errorMessage && (
        <div className="absolute inset-x-0 bottom-20 flex items-center justify-center px-6">
          <p className="rounded-lg bg-black/70 backdrop-blur-sm px-3 py-1.5 text-center text-xs text-white/70">
            {errorMessage}
          </p>
        </div>
      )}
    </div>
  );
}
