import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FormBuilderMetadata, formBuilder } from '@postybirb/form-builder';
import {
  AccountId,
  IWebsiteFormFields,
  NullAccount,
  SubmissionType,
} from '@postybirb/types';
import { AccountService } from '../account/account.service';
import { UserSpecifiedWebsiteOptionsService } from '../user-specified-website-options/user-specified-website-options.service';
import { DefaultWebsiteOptions } from '../websites/models/default-website-options';
import { isFileWebsite } from '../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../websites/models/website-modifiers/message-website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { FormGenerationRequestDto } from './dtos/form-generation-request.dto';

@Injectable()
export class FormGeneratorService {
  constructor(
    private readonly websiteRegistryService: WebsiteRegistryService,
    private readonly userSpecifiedWebsiteOptionsService: UserSpecifiedWebsiteOptionsService,
    private readonly accountService: AccountService
  ) {}

  /**
   * Generates the form properties for a submission option.
   * Form properties are used for form generation in UI.
   *
   * @param {FormGenerationRequestDto} request
   */
  async generateForm(
    request: FormGenerationRequestDto
  ): Promise<FormBuilderMetadata<never>> {
    const account = await this.accountService.findById(request.accountId, {
      failOnMissing: true,
    });

    // Get instance for creation
    const instance = await this.websiteRegistryService.findInstance(account);

    if (!instance) {
      throw new NotFoundException('Unable to find website instance');
    }

    // Get data for inserting into form
    const data = instance.getWebsiteData();

    // Get form model
    let formModel: IWebsiteFormFields = null;
    if (request.type === SubmissionType.MESSAGE && isMessageWebsite(instance)) {
      formModel = instance.createMessageModel();
    }

    if (request.type === SubmissionType.FILE && isFileWebsite(instance)) {
      formModel = instance.createFileModel();
    }

    if (!formModel) {
      throw new BadRequestException(
        `Website instance does not support ${request.type}`
      );
    }

    const form = formBuilder(formModel, data);
    const formWithPopulatedDefaults = await this.populateUserDefaults(
      form,
      request.accountId,
      request.type
    );

    if (request.isMultiSubmission) {
      delete formWithPopulatedDefaults.title; // Having title here just causes confusion for multi this flow
    }

    return formWithPopulatedDefaults;
  }

  /**
   * Returns the default fields form.
   * @param {SubmissionType} type
   */
  async getDefaultForm(type: SubmissionType, isMultiSubmission = false) {
    const form = await this.populateUserDefaults(
      formBuilder(new DefaultWebsiteOptions(), {}),
      new NullAccount().id,
      type
    );
    if (isMultiSubmission) {
      delete form.title; // Having title here just causes confusion for multi this flow
    }
    return form;
  }

  private async populateUserDefaults(
    form: FormBuilderMetadata<never>,
    accountId: AccountId,
    type: SubmissionType
  ): Promise<FormBuilderMetadata<never>> {
    const userSpecifiedDefaults =
      await this.userSpecifiedWebsiteOptionsService.findByAccountAndSubmissionType(
        accountId,
        type
      );

    if (userSpecifiedDefaults) {
      Object.entries(userSpecifiedDefaults.options).forEach(([key, value]) => {
        const field = form[key];
        if (field) {
          // eslint-disable-next-line no-param-reassign
          field.defaultValue = value ?? field.defaultValue;
        }
      });
    }

    return form;
  }
}
