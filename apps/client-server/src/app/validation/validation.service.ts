import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  ISubmission,
  IWebsiteFormFields,
  IWebsiteOptions,
  PostData,
  SubmissionType,
  ValidationResult,
} from '@postybirb/types';
import { parse } from 'path';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { UnknownWebsite } from '../websites/website';
import { WebsiteRegistryService } from '../websites/website-registry.service';

type SubValidation = (
  result: ValidationResult,
  websiteInstance: UnknownWebsite,
  data: PostData<ISubmission, IWebsiteFormFields>,
  submission: ISubmission
) => Promise<void>;

@Injectable()
export class ValidationService {
  private readonly logger = Logger();

  private readonly validations: SubValidation[] = [this.validateAcceptedFiles];

  constructor(
    private readonly websiteRegistry: WebsiteRegistryService,
    private readonly postParserService: PostParsersService
  ) {}

  /**
   * Validate a submission for all website options.
   *
   * @param {ISubmission} submission
   * @return {*}  {Promise<ValidationResult[]>}
   */
  public async validateSubmission(
    submission: ISubmission
  ): Promise<ValidationResult[]> {
    this.logger.debug(`Validating submission ${submission.id}`);
    return Promise.all(
      submission.options.map((website) => this.validate(submission, website))
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
    websiteOption: IWebsiteOptions
  ): Promise<ValidationResult> {
    try {
      this.logger.debug(
        `Validating submission ${submission.id} with website ${websiteOption.account.id} (${websiteOption.id})`
      );
      const website = this.websiteRegistry.findInstance(websiteOption.account);
      if (!website) {
        this.logger.error(
          `Failed to find website instance for account ${websiteOption.account.id}`
        );
        throw new Error(
          `Failed to find website instance for account ${websiteOption.account.id}`
        );
      }
      // All sub-validations mutate the result object
      const result: ValidationResult = {
        warnings: [],
        errors: [],
      };

      const data = await this.postParserService.parse(
        submission,
        website,
        websiteOption
      );

      // eslint-disable-next-line no-restricted-syntax
      for (const validation of this.validations) {
        await validation(result, website, data, submission);
      }

      return result;
    } catch (error) {
      this.logger.warn(
        `Failed to validate website options ${websiteOption.id}`,
        error
      );
      return {
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

  private async validateAcceptedFiles(
    result: ValidationResult,
    websiteInstance: UnknownWebsite,
    data: PostData<ISubmission, IWebsiteFormFields>,
    submission: ISubmission
  ) {
    if (submission.type !== SubmissionType.FILE) {
      return;
    }

    const acceptedMimeTypes =
      websiteInstance.decoratedProps.fileOptions?.acceptedMimeTypes ?? [];

    submission.files.getItems().forEach((file) => {
      if (
        !acceptedMimeTypes.includes(file.mimeType) ||
        acceptedMimeTypes.includes(parse(file.fileName).ext)
      ) {
        result.errors.push({
          id: 'validation.file.invalid-mime-type',
          field: 'files',
          values: {
            mimeType: file.mimeType,
            acceptedMimeTypes,
          },
        });
      }
    });
  }
}
