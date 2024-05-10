import { Injectable } from '@nestjs/common';
import { UsernameShortcut } from '@postybirb/types';
import { Class } from 'type-fest';
import { WebsiteOptions } from '../../database/entities';
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
    const descriptionValue = websiteOptions.data.description?.overrideDefault
      ? websiteOptions.data.description.description
      : defaultOptions.data.description.description;

    // TODO - still need to implement title and tag injectors
    const tree = new DescriptionNodeTree(
      descriptionValue as never,
      this.websiteShortcuts
    );

    // TODO - need to define parse type in websites
    const description = tree.toPlainText();

    // TODO - BBCode? Or just have the ability to inject customer converters into tree
    // TODO - need to update record to have description as string
    return description;
  }
}
