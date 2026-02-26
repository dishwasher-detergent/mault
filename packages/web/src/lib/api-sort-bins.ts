import type {
  BinConfig,
  BinRuleGroup,
  BinSet,
  Result,
} from "@magic-vault/shared";
import { apiDelete, apiGet, apiPost, apiPut } from "./api";

export async function loadSets(): Promise<Result<BinSet[]>> {
  return apiGet<Result<BinSet[]>>("/api/bins");
}

export async function activateSet(guid: string): Promise<Result<BinSet[]>> {
  return apiPut<Result<BinSet[]>>(`/api/bins/${guid}/active`);
}

export async function createSet(name: string): Promise<Result<BinSet[]>> {
  return apiPost<Result<BinSet[]>>("/api/bins", { name });
}

export async function saveSet(name: string): Promise<Result<BinSet[]>> {
  return apiPost<Result<BinSet[]>>("/api/bins/copies", { name });
}

export async function renameSet(
  guid: string,
  name: string,
): Promise<Result<BinSet[]>> {
  return apiPut<Result<BinSet[]>>(`/api/bins/${guid}`, { name });
}

export async function deleteSet(guid: string): Promise<Result<BinSet[]>> {
  return apiDelete<Result<BinSet[]>>(`/api/bins/${guid}`);
}

export async function saveBinConfig({
  binNumber,
  rules,
  isCatchAll,
}: {
  binNumber: number;
  rules: BinRuleGroup;
  isCatchAll?: boolean;
}): Promise<Result<BinConfig>> {
  return apiPut<Result<BinConfig>>(`/api/bins/bins/${binNumber}`, {
    rules,
    isCatchAll,
  });
}

export async function clearBinConfig(binNumber: number): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/bins/bins/${binNumber}`);
}
