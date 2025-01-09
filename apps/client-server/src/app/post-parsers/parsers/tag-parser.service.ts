import { Injectable } from '@nestjs/common';
import { DefaultTagValue } from '@postybirb/types';
import { uniq } from 'lodash';
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
    if (!instance.decoratedProps.tagSupport.supportsTags) {
      return [...DefaultTagValue().tags];
    }

    const mergedOptions = websiteOptions.mergeDefaults(defaultOptions);

    let tags: string[] = await this.tagConvertersService.convert(
      instance,
      mergedOptions.tags.tags,
    );

    tags = tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);

    if (instance.decoratedProps.tagParser) {
      tags = tags.map(instance.decoratedProps.tagParser);
    }

    return uniq(tags).slice(
      0,
      instance.decoratedProps.tagSupport.maxTags ?? Infinity,
    );
  }
}
