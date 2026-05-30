export interface BracketPick {
  matchSlot: string;
  winnerId: string;
  confidence: "high" | "medium" | "low" | "default";
  rationale: string;
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("stratabracket.session");
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}
