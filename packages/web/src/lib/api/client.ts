import { getAuthSession, getOrgId } from "@/lib/auth/session";

export const API_BASE = import.meta.env.VITE_API_URL ?? "";

export async function getAuthHeaders(): Promise<HeadersInit> {
  const session = await getAuthSession();
  const token = session?.token;
  const orgId = getOrgId(session);
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(orgId ? { "X-Org-Id": orgId } : {}),
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(await getAuthHeaders()) },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(await getAuthHeaders()),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { ...(await getAuthHeaders()) },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPostForm<T>(
  path: string,
  formData: FormData,
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { ...(await getAuthHeaders()) },
    body: formData,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
