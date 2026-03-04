import { apiRequest, hasApiBaseUrl } from "@/lib/api/client";

export type SendEmailPayload = {
  providerName: string;
  fromAddress: string;
  replyTo: string;
  recipients: string[];
  subject: string;
  message: string;
};

export async function sendEmailNotification(payload: SendEmailPayload): Promise<boolean> {
  if (!hasApiBaseUrl) {
    return false;
  }

  try {
    await apiRequest<{ success: boolean }>("/notifications/email", {
      method: "POST",
      body: payload,
    });
    return true;
  } catch {
    return false;
  }
}
