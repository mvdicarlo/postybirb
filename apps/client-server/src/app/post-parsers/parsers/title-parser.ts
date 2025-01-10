import { Injectable } from '@nestjs/common';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';

@Injectable()
export class TitleParser {
  public async parse(
    defaultOptions: DefaultWebsiteOptions,
    websiteOptions: BaseWebsiteOptions,
  ): Promise<string> {
    const defaultTitleForm = defaultOptions.getFormFieldFor('title');
    const websiteTitleForm = websiteOptions.getFormFieldFor('title');
    const merged = websiteOptions.mergeDefaults(defaultOptions);

    const title = merged.title ?? '';
    const field = websiteTitleForm ?? defaultTitleForm;
    const maxLength = field?.maxLength ?? Infinity;

    return title.trim().slice(0, maxLength);
  }
}
