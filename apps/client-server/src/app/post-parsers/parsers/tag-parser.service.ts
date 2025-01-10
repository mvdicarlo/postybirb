import { Injectable } from '@nestjs/common';
import { TagConvertersService } from '../../tag-converters/tag-converters.service';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';
import { Website } from '../../websites/website';

@Injectable()
export class TagParserService {
  constructor(private readonly tagConvertersService: TagConvertersService) {}

  public async parse(
    instance: Website<unknown>,
    defaultOptions: DefaultWebsiteOptions,
    websiteOptions: BaseWebsiteOptions,
  ): Promise<string[]> {
    const mergedOptions = websiteOptions.mergeDefaults(defaultOptions);
    return mergedOptions.getProcessedTags((tag) =>
      this.tagConvertersService.convert(instance, tag),
    );
  }
}
