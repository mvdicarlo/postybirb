import { Inject, Injectable } from '@nestjs/common';
import {
  IWebsiteFormFields,
  PostData,
  UsernameShortcut,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../constants';
import { Submission, WebsiteOptions } from '../database/entities';
import { UnknownWebsite } from '../websites/website';
import { RatingParser } from './parsers/class-based/rating-parser';
import { TitleParser } from './parsers/class-based/title-parser';
import { TagParserService } from './parsers/service-based/tag-parser.service';

// TODO - write tests for this
@Injectable()
export class PostParsersService {
  private readonly websiteShortcuts: Record<string, UsernameShortcut> = {};

  private readonly ratingParser: RatingParser = new RatingParser();

  private readonly titleParser: TitleParser = new TitleParser();

  constructor(
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Class<UnknownWebsite>[],
    private readonly tagParser: TagParserService
  ) {
    this.websiteImplementations.forEach((website) => {
      const shortcut: UsernameShortcut | undefined =
        website.prototype.decoratedProps.usernameShortcut;
      if (shortcut) {
        this.websiteShortcuts[shortcut.id] = shortcut;
      }
    });
  }

  // TODO - fix submission save form not seeing a rating field change as an update
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
        title: this.titleParser.parse(instance, defaultOptions, websiteOptions),
        rating: this.ratingParser.parse(defaultOptions, websiteOptions),
      },
    };
  }
}
