import { Injectable } from '@nestjs/common';
import { DefaultTagValue, TagValue } from '@postybirb/types';
import { uniq } from 'lodash';
import { WebsiteOptions } from '../database/entities';
import { TagConvertersService } from '../tag-converters/tag-converters.service';
import { Website } from '../websites/website';

// TODO - write tests for this
@Injectable()
export class TagParserService {
  constructor(private readonly tagConvertersService: TagConvertersService) {}

  public async parse(
    instance: Website<unknown>,
    defaultOptions: WebsiteOptions,
    websiteOptions: WebsiteOptions
  ): Promise<TagValue> {
    if (!instance.tagSupport.supportsTags) {
      return { ...DefaultTagValue };
    }

    const defaultTags = defaultOptions.data.tags ?? DefaultTagValue;
    const websiteTags = websiteOptions.data.tags ?? DefaultTagValue;

    let tags: string[] = await this.tagConvertersService.convert(
      instance,
      websiteTags.overrideDefault
        ? websiteTags.tags
        : [...defaultTags.tags, ...websiteTags.tags]
    );

    tags = tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);

    if (instance.tagParser) {
      tags = tags.map(instance.tagParser);
    }

    return {
      overrideDefault: websiteTags.overrideDefault,
      tags: uniq(tags).slice(0, instance.tagSupport.maxTags ?? Infinity),
    };
  }
}
