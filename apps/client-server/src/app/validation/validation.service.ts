import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  EntityId,
  FileSubmission,
  ISubmission,
  IWebsiteFormFields,
  IWebsiteOptions,
  PostData,
  SimpleValidationResult,
  SubmissionType,
  ValidationResult,
} from '@postybirb/types';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import DefaultWebsite from '../websites/implementations/default/default.website';
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
    // this.logger.debug(`Validating submission ${submission.id}`);
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
      // this.logger.debug(
      //   `Validating submission ${submission.id} with website ${websiteOption.account.id} (${websiteOption.id})`,
      // );
      const website = websiteOption.isDefault
        ? new DefaultWebsite(websiteOption.account)
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
        warnings: [],
        errors: [],
      };

      const data = await this.postParserService.parse(
        submission,
        website,
        websiteOption,
      );

      const params: ValidatorParams = {
        result,
        websiteInstance: website,
        data,
        submission,
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
    postData: PostData<ISubmission, IWebsiteFormFields>,
  ): Promise<ValidationResult> {
    let result: SimpleValidationResult;
    try {
      if (submission.type === SubmissionType.FILE && isFileWebsite(website)) {
        result = await website.onValidateFileSubmission(
          postData as unknown as PostData<FileSubmission, IWebsiteFormFields>,
        );
      }

      if (
        submission.type === SubmissionType.MESSAGE &&
        isMessageWebsite(website)
      ) {
        result = await website.onValidateMessageSubmission(postData);
      }

      return {
        id: websiteId,
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
