import { Inject, Injectable } from '@nestjs/common';
import {
  IWebsiteFormFields,
  PostData,
  UsernameShortcut,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../constants';
import { Submission, WebsiteOptions } from '../database/entities';
import { UnknownWebsite, Website } from '../websites/website';
import { RatingParserService } from './rating-parser.service';
import { TagParserService } from './tag-parser.service';

// TODO - write tests for this
@Injectable()
export class PostParsersService {
  private readonly websiteShortcuts: Record<string, UsernameShortcut> = {};

  constructor(
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Class<UnknownWebsite>[],
    private readonly tagParser: TagParserService,
    private readonly ratingParser: RatingParserService
  ) {
    this.websiteImplementations.forEach((website) => {
      const shortcut: UsernameShortcut | undefined =
        website.prototype.usernameShortcut;
      if (shortcut) {
        this.websiteShortcuts[shortcut.id] = shortcut;
      }
    });
  }

  // TODO - fix submission save form not seeing a rating field change as an update
  public async parse(
    submission: Submission,
    instance: Website<unknown>,
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
        rating: this.ratingParser.parse(defaultOptions, websiteOptions),
      },
    };
  }
}
