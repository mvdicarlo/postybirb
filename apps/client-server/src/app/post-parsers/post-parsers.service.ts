import { Injectable } from '@nestjs/common';
import {
  ISubmission,
  IWebsiteFormFields,
  IWebsiteOptions,
  PostData,
} from '@postybirb/types';
import { DefaultWebsiteOptions } from '../websites/models/default-website-options';
import { UnknownWebsite } from '../websites/website';
import { DescriptionParserService } from './parsers/description-parser.service';
import { RatingParser } from './parsers/rating-parser';
import { TagParserService } from './parsers/tag-parser.service';
import { TitleParser } from './parsers/title-parser';

@Injectable()
export class PostParsersService {
  private readonly ratingParser: RatingParser = new RatingParser();

  private readonly titleParser: TitleParser = new TitleParser();

  constructor(
    private readonly tagParser: TagParserService,
    private readonly descriptionParser: DescriptionParserService,
  ) {}

  public async parse(
    submission: ISubmission,
    instance: UnknownWebsite,
    websiteOptions: IWebsiteOptions,
  ): Promise<PostData<IWebsiteFormFields>> {
    const defaultOptions: IWebsiteOptions = submission.options.find(
      (o) => o.isDefault,
    );
    const defaultOpts = Object.assign(new DefaultWebsiteOptions(), {
      ...defaultOptions.data,
    });
    const websiteOpts = Object.assign(instance.getModelFor(submission.type), {
      ...websiteOptions.data,
    });
    const tags = await this.tagParser.parse(instance, defaultOpts, websiteOpts);
    const title = await this.titleParser.parse(defaultOpts, websiteOpts);

    return {
      submission,
      options: {
        ...defaultOptions.data,
        ...websiteOptions.data,
        tags,
        description: await this.descriptionParser.parse(
          instance,
          defaultOpts,
          websiteOpts,
          tags,
          title,
        ),
        title,
        rating: this.ratingParser.parse(defaultOpts, websiteOpts),
      },
    };
  }
}
