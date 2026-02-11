import { Inject, Injectable } from '@nestjs/common';
import { DescriptionType, TipTapNode, UsernameShortcut } from '@postybirb/types';
import isEqual from 'lodash/isEqual';
import { Class } from 'type-fest';
import { WEBSITE_IMPLEMENTATIONS } from '../../constants';
import { CustomShortcutsService } from '../../custom-shortcuts/custom-shortcuts.service';
import { SettingsService } from '../../settings/settings.service';
import { UserConvertersService } from '../../user-converters/user-converters.service';
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

@Injectable()
export class DescriptionParserService {
  private readonly websiteShortcuts: Record<string, UsernameShortcut> = {};

  constructor(
    private readonly settingsService: SettingsService,
    @Inject(WEBSITE_IMPLEMENTATIONS)
    private readonly websiteImplementations: Class<UnknownWebsite>[],
    private readonly customShortcutsService?: CustomShortcutsService,
    private readonly userConvertersService?: UserConvertersService,
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
    const descriptionBlocks: TipTapNode[] =
      descriptionValue.description?.content ?? [];

    const { contentWarning } = mergedOptions;

    // Detect presence of shortcut tags to prevent double insertion
    const hasTitleShortcut = this.hasInlineContentType(
      descriptionBlocks,
      'titleShortcut',
    );
    const hasTagsShortcut = this.hasInlineContentType(
      descriptionBlocks,
      'tagsShortcut',
    );

    const insertionOptions: InsertionOptions = {
      insertTitle:
        descriptionValue.insertTitle && !hasTitleShortcut ? title : undefined,
      insertTags:
        descriptionValue.insertTags && !hasTagsShortcut ? tags : undefined,
      insertAd: allowAd,
    };

    /*
     * We choose to merge blocks here to avoid confusing user expectations.
     * Most editors want you to use Shift + Enter to insert a new line. But in
     * most cases this is not something the user cares about. They just want to
     * see the description on a line-by-line basis. So we choose to merge similar
     * blocks together to avoid confusion.
     */
    const mergedDescriptionBlocks = this.mergeBlocks(descriptionBlocks);

    // Pre-resolve default description
    const defaultDescription = this.mergeBlocks(
      defaultOptions.description.description?.content ?? [],
    );

    // Build tree once with minimal context
    const context: ConversionContext = {
      website: instance.decoratedProps.metadata.name,
      shortcuts: this.websiteShortcuts,
      customShortcuts: new Map(),
      defaultDescription,
      title,
      tags,
      usernameConversions: new Map(),
      contentWarningText: contentWarning,
    };

    const tree = new DescriptionNodeTree(
      context,
      mergedDescriptionBlocks,
      insertionOptions,
    );

    // Resolve and inject into the same tree
    const customShortcuts = await this.resolveCustomShortcutsFromTree(tree);
    const usernameConversions = await this.resolveUsernamesFromTree(
      tree,
      instance,
    );

    tree.updateContext({
      customShortcuts,
      usernameConversions,
    });

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
          const converter = instance.getDescriptionConverter();
          return tree.parseWithConverter(converter);
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
  private async resolveCustomShortcutsFromTree(
    tree: DescriptionNodeTree,
  ): Promise<Map<string, TipTapNode[]>> {
    const customShortcuts = new Map<string, TipTapNode[]>();
    const shortcutIds = tree.findCustomShortcutIds();

    for (const id of shortcutIds) {
      const shortcut = await this.customShortcutsService?.findById(id);
      if (shortcut) {
        const shortcutBlocks = this.mergeBlocks(
          (shortcut.shortcut as any)?.content ?? [],
        );
        customShortcuts.set(id, shortcutBlocks);
      }
    }

    return customShortcuts;
  }

  /**
   * Pre-resolves all usernames found in the description tree.
   */
  private async resolveUsernamesFromTree(
    tree: DescriptionNodeTree,
    instance: Website<unknown>,
  ): Promise<Map<string, string>> {
    const usernameConversions = new Map<string, string>();
    const usernames = tree.findUsernames();

    for (const username of usernames) {
      const converted =
        (await this.userConvertersService?.convert(instance, username)) ??
        username;
      usernameConversions.set(username, converted);
    }

    return usernameConversions;
  }

  /**
   * Merges adjacent blocks of the same type together, inserting a '\n' text node between them.
   * This simulates the visual line-by-line behavior users expect.
   */
  public mergeBlocks(
    blocks: TipTapNode[],
  ): TipTapNode[] {
    const mergedBlocks: TipTapNode[] = [];

    const blockCopy: TipTapNode[] = JSON.parse(JSON.stringify(blocks));
    for (let i = 0; i < blockCopy.length; i++) {
      const currentBlock = blockCopy[i];
      const previousBlock = mergedBlocks[mergedBlocks.length - 1];

      if (!previousBlock) {
        mergedBlocks.push(currentBlock);
      } else if (
        currentBlock.type === previousBlock.type &&
        (currentBlock.content?.length ?? 0) !== 0 &&
        (previousBlock.content?.length ?? 0) !== 0 &&
        isEqual(currentBlock.attrs, previousBlock.attrs)
      ) {
        // Insert a \n text node then merge content
        if (!previousBlock.content) previousBlock.content = [];
        previousBlock.content.push({
          type: 'text',
          text: '\n',
        });
        previousBlock.content.push(...(currentBlock.content ?? []));
      } else {
        mergedBlocks.push(currentBlock);
      }
    }

    return mergedBlocks;
  }

  /**
   * Recursively checks if TipTap nodes contain a specific inline content type.
   */
  private hasInlineContentType(
    blocks: TipTapNode[],
    type: string,
  ): boolean {
    for (const block of blocks) {
      if (block?.type === type) return true;
      if (Array.isArray(block?.content)) {
        if (this.hasInlineContentType(block.content, type)) {
          return true;
        }
      }
    }
    return false;
  }
}
