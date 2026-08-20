export type WebrtcSignalRole = "desktop" | "phone";

export type WebrtcSignalKind = "ready" | "offer" | "answer" | "ice-candidate" | "leave";

export interface WebrtcSignalMessage {
  role: WebrtcSignalRole;
  kind: WebrtcSignalKind;
  payload: unknown;
}
