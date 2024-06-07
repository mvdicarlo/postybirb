import { Injectable } from '@nestjs/common';
import { DefaultTagValue, IWebsiteOptions } from '@postybirb/types';
import { uniq } from 'lodash';
import { TagConvertersService } from '../../tag-converters/tag-converters.service';
import { Website } from '../../websites/website';

@Injectable()
export class TagParserService {
  constructor(private readonly tagConvertersService: TagConvertersService) {}

  public async parse(
    instance: Website<unknown>,
    defaultOptions: IWebsiteOptions,
    websiteOptions: IWebsiteOptions
  ): Promise<string[]> {
    if (!instance.decoratedProps.tagSupport.supportsTags) {
      return [...DefaultTagValue().tags];
    }

    const defaultTags = defaultOptions.data.tags ?? DefaultTagValue();
    const websiteTags = websiteOptions.data.tags ?? DefaultTagValue();

    let tags: string[] = await this.tagConvertersService.convert(
      instance,
      websiteTags.overrideDefault
        ? websiteTags.tags
        : [...defaultTags.tags, ...websiteTags.tags]
    );

    tags = tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);

    if (instance.decoratedProps.tagParser) {
      tags = tags.map(instance.decoratedProps.tagParser);
    }

    return uniq(tags).slice(
      0,
      instance.decoratedProps.tagSupport.maxTags ?? Infinity
    );
  }
}
