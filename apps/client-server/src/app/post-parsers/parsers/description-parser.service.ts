import { Injectable } from '@nestjs/common';
import { WebsiteOptions } from '../../database/entities';
import { Website } from '../../websites/website';

// TODO - write tests for this
@Injectable()
export class DescriptionParserService {
  public async parse(
    instance: Website<unknown>,
    defaultOptions: WebsiteOptions,
    websiteOptions: WebsiteOptions
  ): Promise<string> {
    return null;
  }
}
