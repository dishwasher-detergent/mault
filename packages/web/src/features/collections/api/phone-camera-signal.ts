import { apiPost } from "@/lib/api/client";
import type { PhoneCameraMessage, Result } from "@magic-vault/shared";

export async function postPhoneCameraSignal(
  guid: string,
  message: PhoneCameraMessage,
): Promise<Result<null>> {
  return apiPost<Result<null>>(`/api/collections/${guid}/phone-camera-signal`, message);
}
