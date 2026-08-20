import { collectionsQueryOptions } from "@/features/collections/api/collections";
import { usePhoneCameraBroadcast } from "@/features/scanner/api/use-phone-camera-broadcast";
import { IconCircleCheck, IconLoader2, IconVideoOff } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

export default function PhoneCameraPage() {
  const { t } = useTranslation("scanner");
  const { collectionGuid } = useParams<{ collectionGuid: string }>();
  const { status, localStream, errorMessage } = usePhoneCameraBroadcast(collectionGuid);
  const { data: collections } = useQuery(collectionsQueryOptions);
  const collection = collections?.find((c) => c.guid === collectionGuid);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = localStream;
  }, [localStream]);

  const statusText: Record<typeof status, string> = {
    "requesting-camera": t("phoneCamera.requestingCamera"),
    "camera-error": t("phoneCamera.cameraError"),
    waiting: t("phoneCamera.waitingForDesktop"),
    connecting: t("phoneCamera.statusConnecting"),
    connected: t("phoneCamera.streamingConnected"),
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 relative bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="flex-1 min-h-0 w-full h-full object-cover"
      />
      <div className="absolute inset-x-0 top-0 p-4 flex flex-col items-center gap-1 bg-gradient-to-b from-black/70 to-transparent text-white text-center">
        <p className="text-sm font-medium">
          {collection
            ? t("phoneCamera.streamingTo", { name: collection.name })
            : t("phoneCamera.dialogTitle")}
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-2 text-white text-sm">
        {status === "connected" ? (
          <IconCircleCheck className="size-4 text-green-400" />
        ) : status === "camera-error" ? (
          <IconVideoOff className="size-4 text-destructive" />
        ) : (
          <IconLoader2 className="size-4 animate-spin" />
        )}
        <span>{statusText[status]}</span>
      </div>
      {status === "camera-error" && errorMessage && (
        <p className="absolute inset-x-0 bottom-16 text-center text-xs text-white/70 px-6">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
