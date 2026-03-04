type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  signal?: AbortSignal;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const hasApiBaseUrl = typeof API_BASE_URL === "string" && API_BASE_URL.trim().length > 0;

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!hasApiBaseUrl) {
    throw new Error("API base URL is not configured.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}
