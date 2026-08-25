export type PhoneCameraMessageKind =
  | "camera_ready"
  | "camera_left"
  | "capture_requested"
  | "capture_response"
  | "desktop_disconnected";

export interface PhoneCameraMessage {
  kind: PhoneCameraMessageKind;
  requestId?: string;
  imageDataUrl?: string;
}
