import type { AppRepository } from "../domain/repository";
import type { User } from "../domain/types";

export class AccountUsecase {
  constructor(private readonly repo: AppRepository) {}

  async withdraw(user: User): Promise<{
    deleted: true;
    deletedUserIds: string[];
    deletedCoupleId?: string;
  }> {
    const result = await this.repo.deleteAccountDataForUser(user.id);
    return {
      deleted: true,
      ...result,
    };
  }
}
