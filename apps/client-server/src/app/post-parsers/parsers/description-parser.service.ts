import { Inject, Injectable } from '@nestjs/common';
import {
  DescriptionType,
  IWebsiteOptions,
  UsernameShortcut,
} from '@postybirb/types';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { SettingsService } from '../../settings/settings.service';
import { isWithCustomDescriptionParser } from '../../websites/models/website-modifiers/with-custom-description-parser';
import { UnknownWebsite, Website } from '../../websites/website';
import {
  DescriptionNodeTree,
  InsertionOptions,
} from '../models/description-node/description-node-tree';

@Injectable()
export class DescriptionParserService {
  private readonly websiteShortcuts: Record<string, UsernameShortcut> = {};

  constructor(
    private readonly settingsService: SettingsService,
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Class<UnknownWebsite>[],
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
    title: string,
  ): Promise<string> {
    const { descriptionSupport } = instance.decoratedProps;
    const { supportsDescriptionType } = descriptionSupport;

    if (supportsDescriptionType === DescriptionType.NONE) {
      return undefined;
    }

    const settings = await this.settingsService.getDefaultSettings();
    let { allowAd } = settings.settings;

    if (!instance.decoratedProps.allowAd) {
      allowAd = false;
    }

    const descriptionValue = websiteOptions.data.description?.overrideDefault
      ? websiteOptions.data.description.description
      : defaultOptions.data.description.description;

    // TODO - verify tag insertions
    const insertionOptions: InsertionOptions = {
      insertTitle: websiteOptions.data.description.insertTitle
        ? title
        : undefined,
      insertTags: websiteOptions.data.description.insertTags ? tags : undefined,
      insertAd: allowAd,
    };

    const tree = new DescriptionNodeTree(
      descriptionValue as never,
      insertionOptions,
      this.websiteShortcuts,
      {
        title,
        tags,
      },
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
            instance.onDescriptionParse,
          );
          return instance.onAfterDescriptionParse(initialDescription);
        }
        throw new Error(
          `Website does not implement custom description parser: ${instance.constructor.name}`,
        );
      default:
        throw new Error(`Unsupported description type: ${descriptionSupport}`);
    }
  }
}
