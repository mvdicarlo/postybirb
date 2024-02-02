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
import { Class } from 'type-fest';
import { UserSpecifiedWebsiteOptionsService } from '../user-specified-website-options/user-specified-website-options.service';
import { DefaultWebsiteOptions } from '../websites/models/default-website-options';
import { isFileWebsite } from '../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../websites/models/website-modifiers/message-website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { FormGenerationRequestDto } from './dtos/form-generation-request.dto';
import { AccountService } from '../account/account.service';

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
    let FormModel: Class<IWebsiteFormFields> = null;
    if (request.type === SubmissionType.MESSAGE && isMessageWebsite(instance)) {
      FormModel = instance.MessageModel;
    }

    if (request.type === SubmissionType.FILE && isFileWebsite(instance)) {
      FormModel = instance.FileModel;
    }

    if (!FormModel) {
      throw new BadRequestException(
        `Website instance does not support ${request.type}`
      );
    }

    const form = formBuilder(new FormModel(), data);
    return this.populateUserDefaults(form, request.accountId, request.type);
  }

  /**
   * Returns the default fields form.
   * @param {SubmissionType} type
   */
  getDefaultForm(type: SubmissionType) {
    return this.populateUserDefaults(
      formBuilder(new DefaultWebsiteOptions(), {}),
      new NullAccount().id,
      type
    );
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
        if (form[key]) {
          form[key].forEach((field) => {
            // eslint-disable-next-line no-param-reassign
            field.defaultValue = value ?? field.defaultValue;
          });
        }
      });
    }

    return form;
  }
}
