/**
 * 本番は Resend HTTP API。RESEND 未設定時は送信せず、debugCode 経路で完結（ADR 0002 / P0-8）
 */
export type OtpSendResult = { sent: true } | { sent: false; error: string };

export interface OtpEmailSender {
  isConfiguredForDelivery(): boolean;
  sendLoginOtp(toEmail: string, code: string): Promise<OtpSendResult>;
}

export class DevOtpEmailSender implements OtpEmailSender {
  isConfiguredForDelivery(): boolean {
    return false;
  }

  async sendLoginOtp(_toEmail: string, _code: string): Promise<OtpSendResult> {
    return { sent: false, error: "not_configured" };
  }
}

const RESEND_API = "https://api.resend.com/emails";

export class ResendOtpEmailSender implements OtpEmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly fromAddress: string,
  ) {}

  isConfiguredForDelivery(): boolean {
    return this.apiKey.length > 0;
  }

  async sendLoginOtp(toEmail: string, code: string): Promise<OtpSendResult> {
    const body = {
      from: this.fromAddress,
      to: [toEmail],
      subject: "CouplePlan ログインコード",
      text: `ログインコード: ${code}（有効は約10分）`,
    };
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { sent: false, error: `resend_${res.status}: ${errText}` };
    }
    return { sent: true };
  }
}

export function createOtpEmailFromEnv(
  env: { RESEND_API_KEY?: string; RESEND_FROM?: string; NODE_ENV?: string } | undefined,
): OtpEmailSender {
  if (!env) return new DevOtpEmailSender();
  const key = env.RESEND_API_KEY ?? "";
  const from = env.RESEND_FROM ?? "CouplePlan <onboarding@resend.dev>";
  if (key.length > 0) {
    return new ResendOtpEmailSender(key, from);
  }
  return new DevOtpEmailSender();
}
