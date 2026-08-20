// Messages relayed between a desktop scanner session and a phone paired as
// its camera, over the collection's existing session SSE stream (see
// server routes/collections.ts's /:guid/phone-camera-signal +
// /:guid/stream). No WebRTC involved - the phone only ever uploads a single
// captured photo per request, so this stays plain request/response over
// the app's normal authenticated HTTPS API.
export type PhoneCameraMessageKind =
  | "camera_ready"
  | "camera_left"
  | "capture_requested"
  | "capture_response";

export interface PhoneCameraMessage {
  kind: PhoneCameraMessageKind;
  requestId?: string;
  imageDataUrl?: string;
}
