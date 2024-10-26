import { Injectable } from '@nestjs/common';
import { TextFieldType } from '@postybirb/form-builder';
import { ISubmission, IWebsiteOptions } from '@postybirb/types';
import { FormGeneratorService } from '../../form-generator/form-generator.service';
import { UnknownWebsite } from '../../websites/website';

type TitleType = { title: TextFieldType[] };

@Injectable()
export class TitleParserService {
  constructor(private readonly formGeneratorService: FormGeneratorService) {}

  public async parse(
    submission: ISubmission,
    instance: UnknownWebsite,
    defaultOptions: IWebsiteOptions,
    websiteOptions: IWebsiteOptions,
  ): Promise<string> {
    const defaultForm: TitleType =
      (await this.formGeneratorService.getDefaultForm(
        submission.type,
      )) as unknown as TitleType;
    const websiteForm: TitleType =
      defaultOptions.id === websiteOptions.id
        ? defaultForm
        : ((await this.formGeneratorService.generateForm({
            type: submission.type,
            accountId: instance.accountId,
          })) as unknown as TitleType);

    const title = websiteOptions.data.title ?? defaultOptions.data.title ?? '';
    const field: TextFieldType =
      websiteForm?.title[0] ??
      defaultForm?.title[0] ??
      ({ maxLength: Infinity } as TextFieldType);
    const maxLength = field?.maxLength ?? Infinity;

    return title.trim().slice(0, maxLength);
  }
}
