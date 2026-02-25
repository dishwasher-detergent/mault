import type { Result, BinConfig, BinRuleGroup, BinSet } from "@magic-vault/shared";
import { apiGet, apiPost, apiPut, apiDelete } from "./api";

export async function loadSets(): Promise<Result<BinSet[]>> {
  return apiGet<Result<BinSet[]>>("/api/sort-bins");
}

export async function activateSet(guid: string): Promise<Result<BinSet[]>> {
  return apiPost<Result<BinSet[]>>(`/api/sort-bins/activate/${guid}`);
}

export async function createSet(name: string): Promise<Result<BinSet[]>> {
  return apiPost<Result<BinSet[]>>("/api/sort-bins/create", { name });
}

export async function saveSet(name: string): Promise<Result<BinSet[]>> {
  return apiPost<Result<BinSet[]>>("/api/sort-bins/save-as", { name });
}

export async function deleteSet(guid: string): Promise<Result<BinSet[]>> {
  return apiDelete<Result<BinSet[]>>(`/api/sort-bins/${guid}`);
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
  return apiPut<Result<BinConfig>>(`/api/sort-bins/bin/${binNumber}`, {
    rules,
    isCatchAll,
  });
}

export async function clearBinConfig(binNumber: number): Promise<Result<null>> {
  return apiDelete<Result<null>>(`/api/sort-bins/bin/${binNumber}`);
}
