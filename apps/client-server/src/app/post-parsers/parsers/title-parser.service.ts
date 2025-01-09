import { Injectable } from '@nestjs/common';
import { formBuilder, TextFieldType } from '@postybirb/form-builder';
import { FormGeneratorService } from '../../form-generator/form-generator.service';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';

type TitleType = { title: TextFieldType };

@Injectable()
export class TitleParserService {
  constructor(private readonly formGeneratorService: FormGeneratorService) {}

  public async parse(
    defaultOptions: DefaultWebsiteOptions,
    websiteOptions: BaseWebsiteOptions,
  ): Promise<string> {
    const defaultForm = formBuilder(defaultOptions, {}) as unknown as TitleType;
    const websiteForm = formBuilder(websiteOptions, {}) as unknown as TitleType;
    const merged = websiteOptions.mergeDefaults(defaultOptions);

    const title = merged.title ?? '';
    const field = websiteForm?.title ?? defaultForm?.title;
    const maxLength = field?.maxLength ?? Infinity;

    return title.trim().slice(0, maxLength);
  }
}
