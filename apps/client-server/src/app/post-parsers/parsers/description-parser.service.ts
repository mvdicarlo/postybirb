import { Inject, Injectable } from '@nestjs/common';
import { DescriptionType, UsernameShortcut } from '@postybirb/types';
import isEqual from 'lodash/isEqual';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { CustomShortcutsService } from '../../custom-shortcuts/custom-shortcuts.service';
import { SettingsService } from '../../settings/settings.service';
import { BaseWebsiteOptions } from '../../websites/models/base-website-options';
import { DefaultWebsiteOptions } from '../../websites/models/default-website-options';
import { isWithCustomDescriptionParser } from '../../websites/models/website-modifiers/with-custom-description-parser';
import { isWithRuntimeDescriptionParser } from '../../websites/models/website-modifiers/with-runtime-description-parser';
import { UnknownWebsite, Website } from '../../websites/website';
import {
  DescriptionNodeTree,
  InsertionOptions,
} from '../models/description-node/description-node-tree';
import { ConversionContext } from '../models/description-node/description-node.base';
import { IDescriptionBlockNode } from '../models/description-node/description-node.types';

@Injectable()
export class DescriptionParserService {
  private readonly websiteShortcuts: Record<string, UsernameShortcut> = {};

  constructor(
    private readonly settingsService: SettingsService,
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Class<UnknownWebsite>[],
    private readonly customShortcutsService?: CustomShortcutsService,
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

    // Pre-resolve custom shortcuts recursively
    const customShortcuts = await this.resolveCustomShortcuts(
      mergedDescriptionBlocks,
    );

    // Pre-resolve default description
    const defaultDescription = this.mergeBlocks(
      defaultOptions.description
        .description as unknown as Array<IDescriptionBlockNode>,
    );

    const context: ConversionContext = {
      website: instance.decoratedProps.metadata.name,
      shortcuts: this.websiteShortcuts,
      customShortcuts,
      defaultDescription,
      title,
      tags,
    };

    const tree = new DescriptionNodeTree(
      context,
      mergedDescriptionBlocks,
      insertionOptions,
    );

    const description = this.createDescription(instance, descriptionType, tree);

    return description
      .replace(/(<div><\/div>)$/, '')
      .replace(/(<p><\/p>)$/, '')
      .trim();
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
      case DescriptionType.RUNTIME:
        if (isWithRuntimeDescriptionParser(instance)) {
          return this.createDescription(
            instance,
            instance.getRuntimeParser(),
            tree,
          );
        }
        throw new Error(
          `Website does not implement runtime description mapping: ${instance.constructor.name}`,
        );
      default:
        throw new Error(`Unsupported description type: ${descriptionType}`);
    }
  }

  /**
   * Pre-resolves all custom shortcuts found in the description tree.
   * Note: Does not handle nested shortcuts - users should not create circular references.
   */
  private async resolveCustomShortcuts(
    blocks: Array<IDescriptionBlockNode>,
  ): Promise<Map<string, IDescriptionBlockNode[]>> {
    const customShortcuts = new Map<string, IDescriptionBlockNode[]>();
    const shortcutIds = this.findCustomShortcutIds(blocks);

    for (const id of shortcutIds) {
      const shortcut = await this.customShortcutsService?.findById(id);
      if (shortcut) {
        const shortcutBlocks = this.mergeBlocks(
          shortcut.shortcut as unknown as Array<IDescriptionBlockNode>,
        );
        customShortcuts.set(id, shortcutBlocks);
      }
    }

    return customShortcuts;
  }

  /**
   * Recursively finds all custom shortcut IDs in the description tree.
   */
  private findCustomShortcutIds(
    blocks: Array<IDescriptionBlockNode>,
  ): Set<string> {
    const ids = new Set<string>();

    const processContent = (content: unknown[]) => {
      for (const item of content) {
        if (
          typeof item === 'object' &&
          item !== null &&
          'type' in item &&
          item.type === 'customShortcut' &&
          'props' in item &&
          typeof item.props === 'object' &&
          item.props !== null &&
          'id' in item.props
        ) {
          ids.add(item.props.id as string);
        }
        if (
          typeof item === 'object' &&
          item !== null &&
          'content' in item &&
          Array.isArray(item.content)
        ) {
          processContent(item.content);
        }
      }
    };

    for (const block of blocks) {
      if (block.content && Array.isArray(block.content)) {
        processContent(block.content);
      }
    }

    return ids;
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
