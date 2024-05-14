import { Injectable } from '@nestjs/common';
import { DescriptionType, UsernameShortcut } from '@postybirb/types';
import { Class } from 'type-fest';
import { WebsiteOptions } from '../../database/entities';
import { isWithCustomDescriptionParser } from '../../websites/models/website-modifiers/with-custom-description-parser';
import { UnknownWebsite, Website } from '../../websites/website';
import { DescriptionNodeTree } from '../description-node';

// TODO - write tests for this
@Injectable()
export class DescriptionParserService {
  private readonly websiteShortcuts: Record<string, UsernameShortcut> = {};

  constructor(
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
    defaultOptions: WebsiteOptions,
    websiteOptions: WebsiteOptions,
    tags: string[],
    title: string
  ): Promise<string> {
    const { descriptionSupport } = instance.decoratedProps;
    const { supportsDescriptionType } = descriptionSupport;

    if (supportsDescriptionType === DescriptionType.NONE) {
      return undefined;
    }

    const descriptionValue = websiteOptions.data.description?.overrideDefault
      ? websiteOptions.data.description.description
      : defaultOptions.data.description.description;

    // TODO - still need to implement title and tag injectors
    // NOTE - tag injection may need to happen post-parse to be able to determine fit
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
