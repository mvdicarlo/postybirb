import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
    EntityId,
    ISubmission,
    IWebsiteOptions,
    PostData,
    SimpleValidationResult,
    SubmissionType,
    ValidationResult,
} from '@postybirb/types';
import { Account } from '../drizzle/models';
import { FileConverterService } from '../file-converter/file-converter.service';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import DefaultWebsite from '../websites/implementations/default/default.website';
import { DefaultWebsiteOptions } from '../websites/models/default-website-options';
import { isFileWebsite } from '../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../websites/models/website-modifiers/message-website';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { validators } from './validators';
import { Validator, ValidatorParams } from './validators/validator.type';

@Injectable()
export class ValidationService {
  private readonly logger = Logger();

  private readonly validations: Validator[] = validators;

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly postParserService: PostParsersService,
    private readonly fileConverterService: FileConverterService,
  ) {}

  /**
   * Validate a submission for all website options.
   *
   * @param {ISubmission} submission
   * @return {*}  {Promise<ValidationResult[]>}
   */
  public async validateSubmission(
    submission: ISubmission,
  ): Promise<ValidationResult[]> {
    return Promise.all(
      submission.options.map((website) => this.validate(submission, website)),
    );
  }

  /**
   * Validate an individual website option.
   *
   * @param {ISubmission} submission
   * @param {IWebsiteOptions} websiteOption
   * @return {*}  {Promise<ValidationResult>}
   */
  public async validate(
    submission: ISubmission,
    websiteOption: IWebsiteOptions,
  ): Promise<ValidationResult> {
    try {
      const website = websiteOption.isDefault
        ? new DefaultWebsite(new Account(websiteOption.account))
        : this.websiteRegistry.findInstance(websiteOption.account);
      if (!website) {
        this.logger.error(
          `Failed to find website instance for account ${websiteOption.account.id}`,
        );
        throw new Error(
          `Failed to find website instance for account ${websiteOption.account.id}`,
        );
      }
      // All sub-validations mutate the result object
      const result: ValidationResult = {
        id: websiteOption.id,
        account: website.accountInfo,
        warnings: [],
        errors: [],
      };

      const data = await this.postParserService.parse(
        submission,
        website,
        websiteOption,
      );

      const defaultOptions: IWebsiteOptions = submission.options.find(
        (o) => o.isDefault,
      );
      const defaultOpts = Object.assign(new DefaultWebsiteOptions(), {
        ...defaultOptions.data,
      });
      const mergedWebsiteOptions = Object.assign(
        website.getModelFor(submission.type),
        websiteOption.data,
      ).mergeDefaults(defaultOpts);

      const params: ValidatorParams = {
        result,
        websiteInstance: website,
        data,
        submission,
        fileConverterService: this.fileConverterService,
        mergedWebsiteOptions,
      };
      // eslint-disable-next-line no-restricted-syntax
      for (const validation of this.validations) {
        await validation(params);
      }

      const instanceResult = await this.validateWebsiteInstance(
        websiteOption.id,
        submission,
        website,
        data,
      );

      result.warnings.push(...(instanceResult.warnings ?? []));
      result.errors.push(...(instanceResult.errors ?? []));

      return result;
    } catch (error) {
      this.logger.warn(
        `Failed to validate website options ${websiteOption.id}`,
        error,
      );
      return {
        id: websiteOption.id,
        account: new Account(websiteOption.account).toJSON(),
        warnings: [
          {
            id: 'validation.failed',
            values: {
              message: error.message,
            },
          },
        ],
      };
    }
  }

  private async validateWebsiteInstance(
    websiteId: EntityId,
    submission: ISubmission,
    website: UnknownWebsite,
    postData: PostData,
  ): Promise<ValidationResult> {
    let result: SimpleValidationResult;
    try {
      if (submission.type === SubmissionType.FILE && isFileWebsite(website)) {
        result = await website.onValidateFileSubmission(postData);
      }

      if (
        submission.type === SubmissionType.MESSAGE &&
        isMessageWebsite(website)
      ) {
        result = await website.onValidateMessageSubmission(postData);
      }

      return {
        id: websiteId,
        account: website.accountInfo,
        warnings: result?.warnings,
        errors: result?.errors,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to validate website instance for submission ${submission.id}, website ${websiteId}, type ${submission.type}, instance ${website.constructor.name}`,
        error,
      );
      return {
        id: websiteId,
        account: website.accountInfo,
        warnings: [
          {
            id: 'validation.failed',
            values: {
              message: error.message,
            },
          },
        ],
      };
    }
  }
}
