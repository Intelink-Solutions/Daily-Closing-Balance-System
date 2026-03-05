import { apiRequest, clearAuthToken, hasApiBaseUrl, setAuthToken } from "@/lib/api/client";

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

type AuthUserPayload = {
  id: number | string;
  name: string;
  email: string;
  role?: string;
  created_at?: string;
};

type LoginPayload = {
  user: AuthUserPayload;
  token: string;
};

export async function loginApi(email: string, password: string) {
  if (!hasApiBaseUrl) {
    return {
      ok: false,
      user: null,
      token: null,
      message: "API base URL is not configured.",
    };
  }

  try {
    const response = await apiRequest<ApiEnvelope<LoginPayload>>("/login", {
      method: "POST",
      body: { email, password },
    });

    setAuthToken(response.data.token);

    return {
      ok: true,
      user: response.data.user,
      token: response.data.token,
      message: response.message,
    };
  } catch {
    return {
      ok: false,
      user: null,
      token: null,
      message: "Invalid credentials or API unavailable.",
    };
  }
}

export async function logoutApi() {
  try {
    return await apiRequest<ApiEnvelope<null>>("/logout", {
      method: "POST",
    });
  } finally {
    clearAuthToken();
  }
}
