import { Injectable } from '@nestjs/common';
import { TextFieldType } from '@postybirb/form-builder';
import { IWebsiteOptions } from '@postybirb/types';
import { Submission } from '../../database/entities';
import { FormGeneratorService } from '../../form-generator/form-generator.service';
import { UnknownWebsite } from '../../websites/website';

type TitleType = { title: TextFieldType[] };

@Injectable()
export class TitleParserService {
  constructor(private readonly formGeneratorService: FormGeneratorService) {}

  public async parse(
    submission: Submission,
    instance: UnknownWebsite,
    defaultOptions: IWebsiteOptions,
    websiteOptions: IWebsiteOptions
  ): Promise<string> {
    const defaultForm: TitleType =
      (await this.formGeneratorService.getDefaultForm(
        submission.type
      )) as TitleType;
    const websiteForm: TitleType =
      (await this.formGeneratorService.generateForm({
        type: submission.type,
        accountId: instance.accountId,
      })) as TitleType;

    const title = websiteOptions.data.title ?? defaultOptions.data.title ?? '';
    const field: TextFieldType =
      websiteForm?.title[0] ??
      defaultForm?.title[0] ??
      ({ maxLength: Infinity } as TextFieldType);
    const maxLength = field?.maxLength ?? Infinity;

    return title.trim().slice(0, maxLength);
  }
}
