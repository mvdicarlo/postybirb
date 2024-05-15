import { Inject, Injectable } from '@nestjs/common';
import {
  Description,
  DescriptionType,
  IWebsiteOptions,
  UsernameShortcut,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { SettingsService } from '../../settings/settings.service';
import { isWithCustomDescriptionParser } from '../../websites/models/website-modifiers/with-custom-description-parser';
import { UnknownWebsite, Website } from '../../websites/website';
import { DescriptionNodeTree } from '../models/description-node.model';

// TODO - write tests for this
@Injectable()
export class DescriptionParserService {
  private readonly websiteShortcuts: Record<string, UsernameShortcut> = {};

  private readonly ad: Description = [
    {
      id: 'ad-spacing',
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [],
      children: [],
    },
    {
      id: 'ad',
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [
        {
          type: 'link',
          href: 'https://postybirb.com',
          content: [
            { type: 'text', text: 'Posted using PostyBirb', styles: {} },
          ],
        },
      ],
      children: [],
    },
  ];

  constructor(
    private readonly settingsService: SettingsService,
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Class<UnknownWebsite>[]
  ) {
    this.websiteImplementations.forEach((website) => {
      const shortcut: UsernameShortcut | undefined =
        website.prototype.decoratedProps.usernameShortcut;
      if (shortcut) {
        this.websiteShortcuts[shortcut.id] = shortcut;
      }
    });
  }

  public async parse(
    instance: Website<unknown>,
    defaultOptions: IWebsiteOptions,
    websiteOptions: IWebsiteOptions,
    tags: string[],
    title: string
  ): Promise<string> {
    const { descriptionSupport } = instance.decoratedProps;
    const { supportsDescriptionType } = descriptionSupport;

    if (supportsDescriptionType === DescriptionType.NONE) {
      return undefined;
    }

    const settings = await this.settingsService.getDefaultSettings();
    const { allowAd } = settings.settings;

    const descriptionValue = websiteOptions.data.description?.overrideDefault
      ? websiteOptions.data.description.description
      : defaultOptions.data.description.description;

    if (allowAd) {
      descriptionValue.push(...this.ad);
    }

    // TODO - still need to implement title and tag injectors
    // NOTE - tag injection may need to happen post-parse to be able to determine fit
    // Might be better to just have checkbox flags for injecting title, tags, and default description
    const tree = new DescriptionNodeTree(
      descriptionValue as never,
      this.websiteShortcuts,
      {
        title,
        tags,
      }
    );

    switch (supportsDescriptionType) {
      case DescriptionType.MARKDOWN:
        return tree.toMarkdown();
      case DescriptionType.HTML:
        return tree.toHtml();
      case DescriptionType.PLAINTEXT:
        return tree.toPlainText();
      case DescriptionType.CUSTOM:
        if (isWithCustomDescriptionParser(instance)) {
          const initialDescription = tree.parseCustom(
            instance.onDescriptionParse
          );
          return instance.onAfterDescriptionParse(initialDescription);
        }
        throw new Error(
          `Website does not implement custom description parser: ${instance.constructor.name}`
        );
      default:
        throw new Error(`Unsupported description type: ${descriptionSupport}`);
    }
  }
}
