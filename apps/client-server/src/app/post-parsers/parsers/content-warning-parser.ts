import { Injectable } from '@nestjs/common';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';

@Injectable()
export class ContentWarningParser {
  public async parse(
    defaultOptions: DefaultWebsiteOptions,
    websiteOptions: BaseWebsiteOptions,
  ): Promise<string> {
    const defaultWarningForm = defaultOptions.getFormFieldFor('contentWarning');
    const websiteWarningForm = websiteOptions.getFormFieldFor('contentWarning');
    const merged = websiteOptions.mergeDefaults(defaultOptions);

    const warning = merged.contentWarning ?? '';
    const field = websiteWarningForm ?? defaultWarningForm;
    const maxLength = field?.maxLength ?? Infinity;

    return warning.trim().slice(0, maxLength);
  }
}
