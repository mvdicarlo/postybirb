import { Injectable } from '@nestjs/common';
import { Account, Submission, WebsiteOptions } from '@postybirb/database';
import { formBuilder } from '@postybirb/form-builder';
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
import { toError } from '@postybirb/utils/common';
import { FileConverterService } from '../file-converter/file-converter.service';
import { FileService } from '../file/file.service';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { DefaultWebsiteOptions } from '../websites/models/default-website-options';
import { isFileWebsite } from '../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../websites/models/website-modifiers/message-website';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { validators } from './validators';
import {
    FieldValidator,
    Validator,
    ValidatorParams,
} from './validators/validator.type';

@Injectable()
export class ValidationService {
  private readonly logger = Logger(this.constructor.name);

  private readonly validations: Validator[] = validators;

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly postParserService: PostParsersService,
    private readonly fileConverterService: FileConverterService,
    private readonly fileService: FileService,
  ) {}

  /**
   * Validate a submission for all website options.
   *
   * @param {ISubmission} submission
   * @return {*}  {Promise<ValidationResult[]>}
   */
  public async validateSubmission(
    submission: Submission,
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
    submission: Submission,
    websiteOption: WebsiteOptions,
  ): Promise<ValidationResult> {
    try {
      const website = websiteOption.isDefault
        ? this.websiteRegistry.createDefaultWebsiteInstance(
            new Account(websiteOption.account),
          )
        : this.websiteRegistry.findInstance(websiteOption.account);

      if (!website) {
        this.logger.error(
          `Failed to find website instance for account ${websiteOption.accountId}`,
        );
        throw new Error(
          `Failed to find website instance for account ${websiteOption.accountId}`,
        );
      }

      // All sub-validations mutate the result object
      const result: ValidationResult = {
        id: websiteOption.id,
        account: website.account.toDTO(),
        warnings: [],
        errors: [],
      };

      const data = await this.postParserService.parse(
        submission,
        website,
        websiteOption,
        // Skip description truncation during validation so length validators can
        // detect (and warn about) descriptions that exceed the limit. The actual
        // post pipeline parses separately and still truncates.
        true,
      );

      const defaultOptions = submission.options.find((o) => o.isDefault);
      if (!defaultOptions) throw new Error('No default options found');

      const defaultOpts = Object.assign(new DefaultWebsiteOptions(), {
        ...defaultOptions.data,
      });

      const websiteOptions = website.getModelFor(submission.type);
      // Derive all options and properties to operate on the same object that will be used for actual posting
      formBuilder(websiteOptions, website.getWebsiteData());

      const mergedWebsiteOptions = Object.assign(
        websiteOptions,
        websiteOption.data,
      ).mergeDefaults(defaultOpts);

      const params: ValidatorParams = {
        result,
        validator: new FieldValidator(result.errors, result.warnings),
        websiteInstance: website,
        data,
        submission,
        fileConverterService: this.fileConverterService,
        fileService: this.fileService,
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
        account: new Account(websiteOption.account).toDTO(),
        warnings: [
          {
            id: 'validation.failed',
            values: {
              message: toError(error).message,
            },
          },
        ],
        errors: [],
      };
    }
  }

  private async validateWebsiteInstance(
    websiteId: EntityId,
    submission: ISubmission,
    website: UnknownWebsite,
    postData: PostData,
  ): Promise<ValidationResult> {
    let result: SimpleValidationResult | undefined;
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
        account: website.account.toDTO(),
        warnings: result?.warnings ?? [],
        errors: result?.errors ?? [],
      };
    } catch (error) {
      this.logger.warn(
        `Failed to validate website instance for submission ${submission.id}, website ${websiteId}, type ${submission.type}, instance ${website.constructor.name}`,
        error,
      );
      return {
        id: websiteId,
        account: website.account.toDTO(),
        warnings: [
          {
            id: 'validation.failed',
            values: {
              message: toError(error).message,
            },
          },
        ],
        errors: [],
      };
    }
  }
}
