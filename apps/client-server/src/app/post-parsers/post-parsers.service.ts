import { Inject, Injectable } from '@nestjs/common';
import { IWebsiteFormFields, PostData } from '@postybirb/types';
import { WEBSITE_IMPLEMENTATIONS } from '../constants';
import { Submission, WebsiteOptions } from '../database/entities';
import { UnknownWebsite } from '../websites/website';
import { DescriptionParserService } from './parsers/description-parser.service';
import { RatingParser } from './parsers/rating-parser';
import { TagParserService } from './parsers/tag-parser.service';
import { TitleParserService } from './parsers/title-parser.service';

// TODO - write tests for this
@Injectable()
export class PostParsersService {
  private readonly ratingParser: RatingParser = new RatingParser();

  constructor(
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly tagParser: TagParserService,
    private readonly titleParser: TitleParserService,
    private readonly descriptionParser: DescriptionParserService
  ) {}

  public async parse(
    submission: Submission,
    instance: UnknownWebsite,
    websiteOptions: WebsiteOptions
  ): Promise<PostData<Submission, IWebsiteFormFields>> {
    const defaultOptions: WebsiteOptions = submission.options.find(
      (o) => o.isDefault
    );
    const tags = await this.tagParser.parse(
      instance,
      defaultOptions,
      websiteOptions
    );
    return {
      submission,
      options: {
        ...defaultOptions.data,
        ...websiteOptions.data,
        tags,
        title: await this.titleParser.parse(
          submission,
          instance,
          defaultOptions,
          websiteOptions
        ),
        rating: this.ratingParser.parse(defaultOptions, websiteOptions),
      },
    };
  }
}
