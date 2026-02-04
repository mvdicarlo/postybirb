import { UsernameShortcut } from '@postybirb/types';
import {
  ConversionContext,
  IDescriptionBlockNodeClass,
  IDescriptionInlineNodeClass,
  IDescriptionTextNodeClass,
  NodeConverter,
} from '../description-node.base';
import { IDescriptionBlockNode } from '../description-node.types';

// Type for nodes that have the accept method
export type AcceptableBlockNode = IDescriptionBlockNodeClass & {
  accept<T>(converter: NodeConverter<T>, context: ConversionContext): T;
};

/**
 * Base converter with common utilities.
 */
export abstract class BaseConverter implements NodeConverter<string> {
  /** Current depth for nested block rendering */
  protected currentDepth = 0;

  abstract convertBlockNode(
    node: IDescriptionBlockNodeClass,
    context: ConversionContext,
  ): string;

  abstract convertInlineNode(
    node: IDescriptionInlineNodeClass,
    context: ConversionContext,
  ): string;

  abstract convertTextNode(
    node: IDescriptionTextNodeClass,
    context: ConversionContext,
  ): string;

  private processingDefaultDescription = false;

  /**
   * Trims empty strings from the start and end of the results array,
   * preserving empty strings in the middle (for intentional blank lines).
   * Returns the trimmed array joined with the separator.
   */
  private trimAndJoinResults(results: string[], separator: string): string {
    if (results.length === 0) return '';

    let startIndex = 0;
    let endIndex = results.length - 1;

    // Find first non-empty result
    while (startIndex < results.length && results[startIndex] === '') {
      startIndex++;
    }

    // Find last non-empty result
    while (endIndex >= startIndex && results[endIndex] === '') {
      endIndex--;
    }

    // If all results are empty, return empty string
    if (startIndex > endIndex) {
      return '';
    }

    // Keep only the trimmed range and join
    return results.slice(startIndex, endIndex + 1).join(separator);
  }

  /**
   * Converts an array of block nodes.
   * Empty blocks are preserved in the middle but trimmed from start and end.
   */
  convertBlocks(
    nodes: AcceptableBlockNode[],
    context: ConversionContext,
  ): string {
    const results = nodes.map((node) => node.accept(this, context));
    return this.trimAndJoinResults(results, this.getBlockSeparator());
  }

  /**
   * Converts raw block data to nodes and then converts them.
   */
  convertRawBlocks(
    blocks: IDescriptionBlockNode[],
    context: ConversionContext,
  ): string {
    const isDefaultDescription = blocks === context.defaultDescription;
    if (isDefaultDescription) {
      if (this.processingDefaultDescription) {
        return '';
      }
      this.processingDefaultDescription = true;
    }

    try {
      // Import locally to avoid circular dependency
      // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
      const { DescriptionBlockNode } = require('../block-description-node');
      const nodes = blocks.map((block) => new DescriptionBlockNode(block));
      return this.convertBlocks(nodes, context);
    } finally {
      if (isDefaultDescription) {
        this.processingDefaultDescription = false;
      }
    }
  }

  /**
   * Returns the separator to use between blocks.
   */
  protected abstract getBlockSeparator(): string;

  /**
   * Converts children blocks with increased depth.
   * Override in subclasses to provide format-specific indentation.
   */
  /**
   * Converts children blocks with increased depth.
   * Empty blocks are preserved in the middle but trimmed from start and end.
   * Override in subclasses to provide format-specific indentation.
   */
  protected convertChildren(
    children: IDescriptionBlockNodeClass[],
    context: ConversionContext,
  ): string {
    if (!children || children.length === 0) return '';

    this.currentDepth += 1;
    try {
      const results = children.map((child) =>
        (child as AcceptableBlockNode).accept(this, context),
      );
      return this.trimAndJoinResults(results, this.getBlockSeparator());
    } finally {
      this.currentDepth -= 1;
    }
  }

  /**
   * Helper to check if username shortcut should be rendered for this website.
   */
  protected shouldRenderUsernameShortcut(
    node: IDescriptionInlineNodeClass,
    context: ConversionContext,
  ): boolean {
    if (node.type !== 'username') return true;

    const onlyTo = (node.props.only?.split(',') ?? [])
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);

    if (onlyTo.length === 0) return true;

    return onlyTo.includes(context.website.toLowerCase());
  }

  /**
   * Helper to resolve username shortcut link.
   */
  protected getUsernameShortcutLink(
    node: IDescriptionInlineNodeClass,
    context: ConversionContext,
  ):
    | {
      url: string;
      username: string;
    }
    | undefined {
    // Get username from props (new format) or content (old format for backwards compatibility)
    const username = node.props.username 
      ? (node.props.username as string).trim()
      : (node.content as IDescriptionTextNodeClass[])
          .map((child) => child.text)
          .join('')
          .trim();

    // Check if we have a conversion for this username to the target website
    let convertedUsername = username;
    let effectiveShortcutId = node.props.shortcut;

    const converted = context.usernameConversions?.get(username);
    if (converted && converted !== username) {
      // Use the converted username and switch to target website's shortcut
      convertedUsername = converted;
      effectiveShortcutId = context.website;
    }

    const shortcut: UsernameShortcut | undefined =
      context.shortcuts[effectiveShortcutId];
    const url =
      shortcut?.convert?.call(node, context.website, effectiveShortcutId) ??
      shortcut?.url;

    return convertedUsername && url
      ? { url: url.replace('$1', convertedUsername), username: convertedUsername }
      : undefined;
  }
}
