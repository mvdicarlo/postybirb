import { Inject, Injectable } from '@nestjs/common';
import { DescriptionType, UsernameShortcut } from '@postybirb/types';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { SettingsService } from '../../settings/settings.service';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';
import { isWithCustomDescriptionParser } from '../../websites/models/website-modifiers/with-custom-description-parser';
import { UnknownWebsite, Website } from '../../websites/website';
import {
  DescriptionNodeTree,
  InsertionOptions,
} from '../models/description-node/description-node-tree';
import { IDescriptionBlockNode } from '../models/description-node/description-node.types';

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
    defaultOptions: DefaultWebsiteOptions,
    websiteOptions: BaseWebsiteOptions,
    tags: string[],
    title: string,
  ): Promise<string> {
    const mergedOptions = websiteOptions.mergeDefaults(defaultOptions);
    const { descriptionType, hidden } =
      mergedOptions.getFormFieldFor('description');

    if (descriptionType === DescriptionType.NONE || hidden) {
      return undefined;
    }

    const settings = await this.settingsService.getDefaultSettings();
    let { allowAd } = settings.settings;

    if (!instance.decoratedProps.allowAd) {
      allowAd = false;
    }

    const descriptionValue = mergedOptions.description;

    const insertionOptions: InsertionOptions = {
      insertTitle: descriptionValue.insertTitle ? title : undefined,
      insertTags: descriptionValue.insertTags ? tags : undefined,
      insertAd: allowAd,
    };

    const tree = new DescriptionNodeTree(
      instance.decoratedProps.metadata.name,
      descriptionValue.description as unknown as Array<IDescriptionBlockNode>,
      insertionOptions,
      this.websiteShortcuts,
      {
        title,
        tags,
      },
    );

    switch (descriptionType) {
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
        throw new Error(`Unsupported description type: ${descriptionType}`);
    }
  }
}
