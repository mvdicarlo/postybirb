import { Injectable } from '@nestjs/common';
import { Logger } from '@postybirb/logger';
import {
  ISubmission,
  IWebsiteOptions,
  ValidationResult,
} from '@postybirb/types';
import { PostParsersService } from '../post-parsers/post-parsers.service';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { validators } from './validators';
import { Validator, ValidatorParams } from './validators/validator.type';

@Injectable()
export class ValidationService {
  private readonly logger = Logger();

  private readonly validations: Validator[] = validators;

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
}
