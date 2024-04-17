import { Inject, Injectable } from '@nestjs/common';
import {
  DefaultTagValue,
  IWebsiteFormFields,
  PostData,
  SubmissionRating,
  TagValue,
  UsernameShortcut,
} from '@postybirb/types';
import { uniq } from 'lodash';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../constants';
import { Submission, WebsiteOptions } from '../database/entities';
import { TagConvertersService } from '../tag-converters/tag-converters.service';
import { UnknownWebsite, Website } from '../websites/website';

@Injectable()
export class PostParsersService {
  private readonly websiteShortcuts: Record<string, UsernameShortcut> = {};

  constructor(
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Class<UnknownWebsite>[],
    private readonly tagConvertersService: TagConvertersService
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
    const tags = await this.parseTags(
      instance,
      defaultOptions.data.tags ?? DefaultTagValue,
      websiteOptions.data.tags ?? DefaultTagValue
    );
    return {
      submission,
      options: {
        ...defaultOptions.data,
        ...websiteOptions.data,
        tags,
        rating: this.parseRating(
          defaultOptions.data.rating ?? SubmissionRating.GENERAL,
          websiteOptions.data.rating ?? SubmissionRating.GENERAL
        ),
      },
    };
  }

  private parseRating(
    defaultRating: SubmissionRating,
    websiteRating: SubmissionRating
  ): SubmissionRating {
    return websiteRating ?? defaultRating ?? SubmissionRating.GENERAL;
  }

  private async parseTags(
    instance: Website<unknown>,
    defaultTags: TagValue,
    websiteTags: TagValue
  ): Promise<TagValue> {
    const tags = websiteTags.overrideDefault
      ? websiteTags.tags
      : [...defaultTags.tags, ...websiteTags.tags];
    return {
      overrideDefault: websiteTags.overrideDefault,
      tags: uniq(tags),
    };
  }
}
