import { neon } from "@/lib/auth/client";
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

let forbiddenHandled = false;

export async function handleForbidden(res: Response): Promise<void> {
  if (res.status !== 403) return;
  if (!forbiddenHandled) {
    forbiddenHandled = true;
    await neon.auth.signOut();
    window.location.href = "/auth/sign-in";
  }
  throw new Error("API error: 403");
}

async function checkResponse(res: Response): Promise<void> {
  await handleForbidden(res);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { ...(await getAuthHeaders()) },
  });
  await checkResponse(res);
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
  await checkResponse(res);
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
  await checkResponse(res);
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "DELETE",
    headers: { ...(await getAuthHeaders()) },
  });
  await checkResponse(res);
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
  await checkResponse(res);
  return res.json();
}
