import Constants from "expo-constants";

/**
 * Base API URL
 * - Expo Go → uses your local machine IP
 * - Production → uses Vercel URL
 */
const API_BASE =
  Constants.expoConfig?.extra?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  "http://localhost:3000";

/**
 * Generic GET helper
 */
export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json();
}

/**
 * Generic POST helper
 */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json();
}
