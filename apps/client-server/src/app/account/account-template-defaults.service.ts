import { Injectable } from '@nestjs/common';
import { AccountRepository, SubmissionRepository } from '@postybirb/database';
import { AccountId, DynamicObject, SubmissionType } from '@postybirb/types';
import { PostyBirbService } from '../common/service/postybirb-service';

/**
 * Resolves the default form field values for an account+submission type by
 * reading the submission template associated with the account.
 */
@Injectable()
export class AccountTemplateDefaultsService extends PostyBirbService<AccountRepository> {
  private readonly submissionRepository = new SubmissionRepository();

  constructor() {
    super(new AccountRepository());
  }

  /**
   * Returns the default options for the given account and submission type,
   * sourced from the account's associated template. Returns undefined when no
   * template is associated or the template has no option for this account.
   */
  async resolveDefaults(
    accountId: AccountId,
    type: SubmissionType,
  ): Promise<DynamicObject | undefined> {
    const account = await this.repository.findById(accountId);
    if (!account) {
      return undefined;
    }

    const templateId =
      type === SubmissionType.FILE
        ? account.defaultFileTemplateId
        : account.defaultMessageTemplateId;
    if (!templateId) {
      return undefined;
    }

    const template = await this.submissionRepository.findById(templateId);
    if (!template || !template.isTemplate) {
      return undefined;
    }

    const option = template.options?.find((o) => o.accountId === accountId);
    return option?.data as DynamicObject | undefined;
  }
}
