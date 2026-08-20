import { apiPost } from "@/lib/api/client";
import type { Result, WebrtcSignalMessage } from "@magic-vault/shared";

export async function postWebrtcSignal(
  guid: string,
  message: WebrtcSignalMessage,
): Promise<Result<null>> {
  return apiPost<Result<null>>(`/api/collections/${guid}/webrtc-signal`, message);
}
