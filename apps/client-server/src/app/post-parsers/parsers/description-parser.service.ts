import { Inject, Injectable } from '@nestjs/common';
import { DescriptionType, UsernameShortcut } from '@postybirb/types';
import isEqual from 'lodash/isEqual';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { SettingsService } from '../../settings/settings.service';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';
import { isWithCustomDescriptionParser } from '../../websites/models/website-modifiers/with-custom-description-parser';
import { UnknownWebsite, Website } from '../../websites/website';
import { DEFAULT_MARKER } from '../models/description-node/block-description-node';
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

    /*
     * We choose to merge blocks here to avoid confusing user expectations.
     * Most editors want you to use Shift + Enter to insert a new line. But in
     * most cases this is not something the user cares about. They just want to
     * see the description on a line-by-line basis. So we choose to merge similar
     * blocks together to avoid confusion.
     */
    const mergedDescriptionBlocks = this.mergeBlocks(
      descriptionValue.description as unknown as Array<IDescriptionBlockNode>,
    );

    const tree = new DescriptionNodeTree(
      instance.decoratedProps.metadata.name,
      mergedDescriptionBlocks,
      insertionOptions,
      this.websiteShortcuts,
      {
        title,
        tags,
      },
    );

    let description = this.createDescription(instance, descriptionType, tree);

    // Support inserting default description by replacing the default marker.
    if (description.includes(DEFAULT_MARKER)) {
      const defaultMergedBlocks = this.mergeBlocks(
        defaultOptions.description
          .description as unknown as Array<IDescriptionBlockNode>,
      );
      const defaultTree = new DescriptionNodeTree(
        instance.decoratedProps.metadata.name,
        defaultMergedBlocks,
        {
          insertTitle: undefined,
          insertTags: undefined,
          insertAd: false,
        },
        this.websiteShortcuts,
        {
          title,
          tags,
        },
      );

      description = description.replace(
        DEFAULT_MARKER,
        this.createDescription(instance, descriptionType, defaultTree),
      );
    }

    return description;
  }

  private createDescription(
    instance: Website<unknown>,
    descriptionType: DescriptionType,
    tree: DescriptionNodeTree,
  ): string {
    switch (descriptionType) {
      case DescriptionType.MARKDOWN:
        return tree.toMarkdown();
      case DescriptionType.HTML:
        return tree.toHtml();
      case DescriptionType.PLAINTEXT:
        return tree.toPlainText();
      case DescriptionType.BBCODE:
        return tree.toBBCode();
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

  /**
   * Merges block into the same type if they are adjacent and have the same type.
   * Merge occurs on block level if all the props in the block are the same.
   *
   * @param {Array<IDescriptionBlockNode>} blocks
   * @return {*}  {Array<IDescriptionBlockNode>}
   */
  public mergeBlocks(
    blocks: Array<IDescriptionBlockNode>,
  ): Array<IDescriptionBlockNode> {
    const mergedBlocks: Array<IDescriptionBlockNode> = [];

    const blockCopy: Array<IDescriptionBlockNode> = JSON.parse(
      JSON.stringify(blocks),
    );
    for (let i = 0; i < blockCopy.length; i++) {
      const currentBlock = blockCopy[i];
      const previousBlock = mergedBlocks[mergedBlocks.length - 1];
      if (!previousBlock) {
        mergedBlocks.push(currentBlock);
      } else if (
        // Check if the current block is of the same type as the previous block
        // Filter out content length of 0 because those are assumed to be padding blocks.
        currentBlock.type === previousBlock.type &&
        currentBlock.content.length !== 0 &&
        previousBlock.content.length !== 0 &&
        isEqual(currentBlock.props, previousBlock.props)
      ) {
        // Insert a \n content then merge together the content of the two blocks
        previousBlock.content.push({
          type: 'text',
          text: '\n',
          styles: {},
          props: {},
        });
        previousBlock.content.push(...currentBlock.content);
      } else {
        // Insert if no action
        mergedBlocks.push(currentBlock);
      }
    }

    return mergedBlocks;
  }
}
