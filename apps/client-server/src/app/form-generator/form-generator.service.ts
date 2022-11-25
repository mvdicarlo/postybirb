import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { formBuilder } from '@postybirb/form-builder';
import { BaseWebsiteOptions, SubmissionType } from '@postybirb/types';
import { Class } from 'type-fest';
import { isFileWebsite } from '../websites/models/website-modifiers/file-website';
import { isMessageWebsite } from '../websites/models/website-modifiers/message-website';
import { WebsiteRegistryService } from '../websites/website-registry.service';
import { FormGenerationRequestDto } from './dtos/form-generation-request.dto';
import { DefaultForm } from './models/default-form';

@Injectable()
export class FormGeneratorService {
  constructor(
    private readonly websiteRegistryService: WebsiteRegistryService
  ) {}

  async generateForm(request: FormGenerationRequestDto) {
    // Get instance for creation
    const instance = await this.websiteRegistryService.findInstance(
      request.account
    );

    if (!instance) {
      throw new NotFoundException('Unable to find website instance');
    }

    // Get data for inserting into form
    const data = instance.getWebsiteData();

    // Get form model
    let FormModel: Class<BaseWebsiteOptions> = null;
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
    console.log(form);

    return form;
  }

  getDefaultForm() {
    return formBuilder(new DefaultForm(), {});
  }
}
