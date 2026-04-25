import { AppError } from "../domain/errors";
import { User } from "../domain/types";
import { InMemoryRepository } from "../infra/inMemoryRepository";

export class AuthUsecase {
  constructor(private repo: InMemoryRepository) {}

  requestOtp(emailRaw: unknown): { requestId: string; expiresInSec: number; debugCode: string } {
    if (typeof emailRaw !== "string" || !emailRaw.trim()) {
      throw new AppError(400, "bad_request", "email is required");
    }
    const email = emailRaw.toLowerCase().trim();
    const requestId = this.repo.newId("otpreq");
    const code = this.repo.newCode(6);
    this.repo.putOtpRequest(requestId, {
      email,
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });
    return { requestId, expiresInSec: 600, debugCode: code };
  }

  verifyOtp(emailRaw: unknown, codeRaw: unknown): { accessToken: string; user: User } {
    if (typeof emailRaw !== "string" || typeof codeRaw !== "string") {
      throw new AppError(400, "bad_request", "email and code are required");
    }
    const email = emailRaw.toLowerCase();
    const otp = this.repo.findOtp(email, codeRaw);
    if (!otp || otp.expiresAt < Date.now()) {
      throw new AppError(401, "invalid_otp", "invalid otp");
    }

    let user = this.repo.findUserByEmail(email);
    if (!user) {
      user = {
        id: this.repo.newId("usr"),
        email,
        displayName: email.split("@")[0],
        createdAt: this.repo.nowIso(),
        updatedAt: this.repo.nowIso(),
      };
      this.repo.saveUser(user);
    }
    const accessToken = this.repo.issueSession(user.id);
    return { accessToken, user };
  }

  resolveUserFromAuthHeader(authHeader: string | undefined): User {
    const auth = authHeader ?? "";
    if (!auth.startsWith("Bearer ")) {
      throw new AppError(401, "unauthorized", "unauthorized");
    }
    const token = auth.slice("Bearer ".length);
    const userId = this.repo.resolveUserIdFromToken(token);
    if (!userId) throw new AppError(401, "unauthorized", "unauthorized");
    const user = this.repo.getUserById(userId);
    if (!user) throw new AppError(401, "unauthorized", "unauthorized");
    return user;
  }
}
