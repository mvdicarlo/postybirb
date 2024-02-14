import { Inject, Injectable } from '@nestjs/common';
import { PostData } from '@postybirb/types';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { Submission, WebsiteOptions } from '../../database/entities';
import { UnknownWebsite, Website } from '../../websites/website';

@Injectable()
export class PostParserService {
  constructor(
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Class<UnknownWebsite>[]
  ) {}

  public parse(
    submission: Submission,
    instance: Website<unknown>,
    websiteOptions: WebsiteOptions<never>
  ): PostData<Submission, never> {
    // TODO
    return null;
  }
}
