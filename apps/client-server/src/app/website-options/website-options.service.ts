import { Collection } from '@mikro-orm/core';
import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AccountId,
  DynamicObject,
  ISubmission,
  ISubmissionMetadata,
  IWebsiteFormFields,
  NULL_ACCOUNT_ID,
  SubmissionMetadataType,
  SubmissionType,
  ValidationResult,
} from '@postybirb/types';
import { AccountService } from '../account/account.service';
import { PostyBirbService } from '../common/service/postybirb-service';
import { Submission, WebsiteOptions } from '../drizzle/models';
import { PostyBirbDatabase } from '../drizzle/postybirb-database/postybirb-database';
import { FormGeneratorService } from '../form-generator/form-generator.service';
import { SubmissionService } from '../submission/services/submission.service';
import { UserSpecifiedWebsiteOptionsService } from '../user-specified-website-options/user-specified-website-options.service';
import { ValidationService } from '../validation/validation.service';
import { DefaultWebsiteOptions } from '../websites/models/default-website-options';
import { CreateWebsiteOptionsDto } from './dtos/create-website-options.dto';
import { UpdateSubmissionWebsiteOptionsDto } from './dtos/update-submission-website-options.dto';
import { UpdateWebsiteOptionsDto } from './dtos/update-website-options.dto';
import { ValidateWebsiteOptionsDto } from './dtos/validate-website-options.dto';

@Injectable()
export class WebsiteOptionsService extends PostyBirbService<'websiteOptions'> {
  private readonly submissionRepository = new PostyBirbDatabase('submission');

  constructor(
    @Inject(forwardRef(() => SubmissionService))
    private readonly submissionService: SubmissionService,
    private readonly accountService: AccountService,
    private readonly userSpecifiedOptionsService: UserSpecifiedWebsiteOptionsService,
    private readonly formGeneratorService: FormGeneratorService,
    private readonly validationService: ValidationService,
  ) {
    super('websiteOptions');
  }

  /**
   * Creates a submission option for a submission.
   *
   * @param {Submission} submission
   * @param {AccountId} accountId
   * @param {DynamicObject} data
   * @param {string} [title]
   */
  async createOption(
    submission: ISubmission,
    accountId: AccountId,
    data: DynamicObject,
    title?: string,
  ) {
    const account = await this.accountService.findById(accountId, {
      failOnMissing: true,
    });
    const isDefault = accountId === NULL_ACCOUNT_ID;

    const userDefinedDefaultOptions =
      await this.userSpecifiedOptionsService.findByAccountAndSubmissionType(
        accountId,
        submission.type,
      );

    const formFields = isDefault
      ? await this.formGeneratorService.getDefaultForm(submission.type)
      : await this.formGeneratorService.generateForm({
          accountId: account.id,
          type: submission.type,
        });

    // Populate with the form fields to get the default values
    const websiteData: IWebsiteFormFields = {
      ...Object.entries(formFields).reduce(
        (acc, [key, field]) => ({
          ...acc,
          [key]: field.defaultValue,
        }),
        {} as IWebsiteFormFields,
      ),
    };

    const mergedData = {
      ...(isDefault ? new DefaultWebsiteOptions() : {}), // Only merge default options if this is the default option
      ...websiteData, // Merge default form fields
      ...(userDefinedDefaultOptions?.options ?? {}), // Merge user defined options
      ...data, // Merge user defined data
      title, // Override title (optional)
    };

    const option = new WebsiteOptions({
      submission,
      account,
      data: mergedData as IWebsiteFormFields,
    });

    return option;
  }

  async create<T extends IWebsiteFormFields>(
    createDto: CreateWebsiteOptionsDto<T>,
  ) {
    const account = await this.accountService.findById(createDto.account, {
      failOnMissing: true,
    });

    let submission: ISubmission<SubmissionMetadataType>;
    try {
      submission = await this.submissionRepository.findOneOrFail(
        createDto.submission,
      );
    } catch {
      throw new NotFoundException(
        `Submission ${createDto.submission} not found.`,
      );
    }

    const exists = submission.options
      .toArray()
      .find((option) => option.account.id === account.id);
    if (exists) {
      // Opt to just update the existing option
      return this.update(exists.id, { data: createDto.data });
    }

    const formFields =
      account.id === NULL_ACCOUNT_ID
        ? await this.formGeneratorService.getDefaultForm(submission.type)
        : await this.formGeneratorService.generateForm({
            accountId: account.id,
            type: submission.type,
          });
    // Populate with the form fields to get the default values
    const websiteData: IWebsiteFormFields = {
      ...Object.entries(formFields).reduce(
        (acc, [key, field]) => ({
          ...acc,
          [key]:
            createDto.data?.[key as keyof IWebsiteFormFields] === undefined
              ? field.defaultValue
              : createDto.data?.[key as keyof IWebsiteFormFields],
        }),
        {} as IWebsiteFormFields,
      ),
    };
    const submissionOptions = new WebsiteOptions({
      submission,
      data: websiteData,
      account,
    });

    await this.repository.persistAndFlush(submissionOptions);

    return submissionOptions;
  }

  update(id: string, update: UpdateWebsiteOptionsDto) {
    this.logger.withMetadata(update).info(`Updating WebsiteOptions '${id}'`);
    return this.repository.update(id, update);
  }

  /**
   * Creates the default submission option that stores shared data
   * across multiple submission options.
   *
   * @param {Submission<ISubmissionMetadata>} submission
   * @param {string} title
   * @return {*}  {Promise<WebsiteOptions>}
   */
  async createDefaultSubmissionOptions(
    submission: ISubmission<ISubmissionMetadata>,
    title: string,
  ): Promise<WebsiteOptions> {
    this.logger
      .withMetadata({ id: submission.id })
      .info('Creating Default Website Options');
    const options = new WebsiteOptions({
      isDefault: true,
      submission,
      account: await this.accountService.findById(NULL_ACCOUNT_ID),
    });

    await this.populateDefaultWebsiteOptions(submission.type, options, title);
    return options;
  }

  private async populateDefaultWebsiteOptions(
    type: SubmissionType,
    entity: WebsiteOptions,
    title?: string,
  ) {
    const defaultOptions =
      (
        await this.userSpecifiedOptionsService.findByAccountAndSubmissionType(
          NULL_ACCOUNT_ID,
          type,
        )
      )?.options ?? {};
    Object.assign(entity, {
      data: {
        ...new DefaultWebsiteOptions(),
        ...defaultOptions,
        title,
      },
    });
  }

  /**
   * Validates a submission option against a website instance.
   * @param {ValidateWebsiteOptionsDto} validate
   * @return {Promise<ValidationResult>}
   */
  async validateWebsiteOption(
    validate: ValidateWebsiteOptionsDto,
  ): Promise<ValidationResult> {
    const { websiteOptionId, submission: submissionId } = validate;
    const submission = await this.submissionService.findById(submissionId, {
      failOnMissing: true,
    });
    const websiteOption = submission.options.find(
      (option) => option.id === websiteOptionId,
    );
    return this.validationService.validate(submission, websiteOption);
  }

  /**
   * Validates all submission options for a submission.
   * @param {string} submissionId
   * @return {*}  {Promise<ValidationResult[]>}
   */
  async validateSubmission(submissionId: string) {
    const submission =
      await this.submissionService.findPopulatedById(submissionId);
    return this.validationService.validateSubmission(submission);
  }

  async updateSubmissionOptions(
    submissionId: string,
    updateDto: UpdateSubmissionWebsiteOptionsDto,
  ) {
    const submission = await this.submissionService.findById(submissionId, {
      failOnMissing: true,
    });

    const { remove, add } = updateDto;
    if (remove?.length) {
      const items = (
        submission.options as Collection<WebsiteOptions>
      ).getItems();
      // eslint-disable-next-line no-restricted-syntax
      for (const id of remove) {
        const option = items.find((opt) => opt.id === id);
        if (option) {
          this.logger.debug(
            `Removing option ${id} from submission ${submissionId}`,
          );
          submission.options.remove(option);
        }
      }
    }

    if (add?.length) {
      const options = await Promise.all(
        add.map((dto) => this.createOption(submission, dto.account, dto.data)),
      );
      submission.options.add(...options);
    }

    await this.submissionRepository.persistAndFlush(submission);
    this.submissionService.emit();
    return submission;
  }
}
