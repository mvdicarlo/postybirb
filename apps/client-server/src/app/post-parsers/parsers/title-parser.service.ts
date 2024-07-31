import { Injectable } from '@nestjs/common';
import { TextFieldType } from '@postybirb/form-builder';
import { Submission, WebsiteOptions } from '../../database/entities';
import { FormGeneratorService } from '../../form-generator/form-generator.service';
import { UnknownWebsite } from '../../websites/website';

@Injectable()
export class TitleParserService {
  constructor(private readonly formGeneratorService: FormGeneratorService) {}

  public async parse(
    submission: Submission,
    instance: UnknownWebsite,
    defaultOptions: WebsiteOptions,
    websiteOptions: WebsiteOptions
  ): Promise<string> {
    const defaultForm = await this.formGeneratorService.getDefaultForm(
      submission.type
    );
    const websiteForm = await this.formGeneratorService.generateForm({
      type: submission.type,
      accountId: instance.accountId,
    });

    const title = websiteOptions.data.title ?? defaultOptions.data.title ?? '';
    const field: TextFieldType =
      (websiteForm.fields.find(
        (f) => f.label.toLowerCase() === 'title'
      ) as TextFieldType) ??
      (defaultForm.fields.find(
        (f) => f.label.toLowerCase() === 'title'
      ) as TextFieldType);
    const maxLength = field?.maxLength ?? Infinity;

    return title.trim().slice(0, maxLength);
  }
}
