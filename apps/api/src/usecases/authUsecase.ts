import { AppError } from "../domain/errors";
import type { AppRepository } from "../domain/repository";
import { User } from "../domain/types";
import type { OtpEmailSender } from "../infra/email/otpEmail";

const OTP_TTL_SEC = 600;
const REFRESH_TTL_SEC = 30 * 24 * 60 * 60;
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX_IN_WINDOW = 5;

export class AuthUsecase {
  constructor(
    private readonly repo: AppRepository,
    private readonly email: OtpEmailSender,
    private readonly allowDebugOtp: boolean,
  ) {}

  /**
   * Resend 等で送信中、`allowDebugOtp` ならレスポンスに `debugCode` も併記する（STG/検証用）
   */
  async requestOtp(
    emailRaw: unknown,
  ): Promise<{ requestId: string; expiresInSec: number; debugCode?: string }> {
    if (typeof emailRaw !== "string" || !emailRaw.trim()) {
      throw new AppError(400, "bad_request", "email is required");
    }
    const email = emailRaw.toLowerCase().trim();
    const now = Date.now();
    const n = await this.repo.countOtpInWindowForEmail(email, now - RATE_WINDOW_MS);
    if (n >= RATE_MAX_IN_WINDOW) {
      const aid = this.repo.newId("aud");
      await this.repo.appendAuthAudit(aid, "otp_rate_limited", now, email, "window_exceeded");
      throw new AppError(429, "rate_limited", "too many otp requests, try later");
    }

    const requestId = this.repo.newId("otpreq");
    const code = this.repo.newOtpCode(6);
    const expiresInSec = OTP_TTL_SEC;
    await this.repo.putOtpRequest(
      requestId,
      { email, code, expiresAt: now + expiresInSec * 1000 },
      now,
    );
    const aid = this.repo.newId("aud");
    await this.repo.appendAuthAudit(aid, "otp_request", now, email, null);

    if (this.email.isConfiguredForDelivery()) {
      const res = await this.email.sendLoginOtp(email, code);
      if (!res.sent) {
        const eid = this.repo.newId("aud");
        await this.repo.appendAuthAudit(
          eid,
          "otp_send_fail",
          Date.now(),
          email,
          "error" in res ? res.error : "unknown",
        );
        throw new AppError(503, "email_unavailable", "failed to send verification email");
      }
      if (this.allowDebugOtp) {
        return { requestId, expiresInSec, debugCode: code };
      }
      return { requestId, expiresInSec };
    }

    return { requestId, expiresInSec, debugCode: code };
  }

  async verifyOtp(
    emailRaw: unknown,
    codeRaw: unknown,
  ): Promise<{ accessToken: string; refreshToken: string; refreshExpiresInSec: number; user: User }> {
    if (typeof emailRaw !== "string" || typeof codeRaw !== "string") {
      throw new AppError(400, "bad_request", "email and code are required");
    }
    const email = emailRaw.toLowerCase();
    const otp = await this.repo.findOtp(email, codeRaw);
    const t = Date.now();
    if (!otp || otp.expiresAt < t) {
      const aid = this.repo.newId("aud");
      await this.repo.appendAuthAudit(aid, "otp_verify_fail", t, email, "invalid_or_expired");
      throw new AppError(401, "invalid_otp", "invalid otp");
    }

    const aidOk = this.repo.newId("aud");
    await this.repo.appendAuthAudit(aidOk, "otp_verify_ok", t, email, null);

    let user = await this.repo.findUserByEmail(email);
    if (!user) {
      user = {
        id: this.repo.newId("usr"),
        email,
        displayName: email.split("@")[0]!,
        createdAt: this.repo.nowIso(),
        updatedAt: this.repo.nowIso(),
      };
      await this.repo.saveUser(user);
    }
    const accessToken = await this.repo.issueSession(user.id);
    const refreshToken = await this.repo.issueRefreshSession(user.id, Date.now() + REFRESH_TTL_SEC * 1000);
    await this.repo.deleteOtpRequest(otp.id);
    return { accessToken, refreshToken, refreshExpiresInSec: REFRESH_TTL_SEC, user };
  }

  async refreshSessionFromToken(
    refreshTokenRaw: unknown,
  ): Promise<{ accessToken: string; user: User }> {
    if (typeof refreshTokenRaw !== "string" || !refreshTokenRaw) {
      throw new AppError(401, "unauthorized", "unauthorized");
    }
    const userId = await this.repo.resolveUserIdFromRefreshToken(refreshTokenRaw, Date.now());
    if (!userId) throw new AppError(401, "unauthorized", "unauthorized");
    const user = await this.repo.getUserById(userId);
    if (!user) throw new AppError(401, "unauthorized", "unauthorized");
    const accessToken = await this.repo.issueSession(user.id);
    return { accessToken, user };
  }

  async revokeRefreshSession(refreshTokenRaw: unknown): Promise<void> {
    if (typeof refreshTokenRaw !== "string" || !refreshTokenRaw) return;
    await this.repo.revokeRefreshSession(refreshTokenRaw);
  }

  async resolveUserFromAuthHeader(authHeader: string | undefined): Promise<User> {
    const auth = authHeader ?? "";
    if (!auth.startsWith("Bearer ")) {
      throw new AppError(401, "unauthorized", "unauthorized");
    }
    const token = auth.slice("Bearer ".length);
    const userId = await this.repo.resolveUserIdFromToken(token);
    if (!userId) throw new AppError(401, "unauthorized", "unauthorized");
    const user = await this.repo.getUserById(userId);
    if (!user) throw new AppError(401, "unauthorized", "unauthorized");
    return user;
  }
}
