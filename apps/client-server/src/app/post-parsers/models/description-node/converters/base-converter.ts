/* eslint-disable @typescript-eslint/no-explicit-any */
import { UsernameShortcut } from '@postybirb/types';
import { ConversionContext } from '../description-node.base';
import {
    InlineTypes,
    isTextNode,
    TipTapNode,
} from '../description-node.types';

/**
 * Base converter for TipTap JSON → output format.
 *
 * Converters process TipTap nodes directly (no wrapper classes).
 * Block-level nodes are dispatched to `convertBlockNode`, inline shortcut
 * atoms to `convertInlineNode`, and text nodes to `convertTextNode`.
 */
export abstract class BaseConverter {
  /** Current depth for nested block rendering */
  protected currentDepth = 0;

  private processingDefaultDescription = false;

  abstract convertBlockNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string;

  abstract convertInlineNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string;

  abstract convertTextNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string;

  /**
   * Trims empty strings from the start and end of the results array,
   * preserving empty strings in the middle (for intentional blank lines).
   */
  private trimAndJoinResults(results: string[], separator: string): string {
    if (results.length === 0) return '';

    let startIndex = 0;
    let endIndex = results.length - 1;

    while (startIndex < results.length && results[startIndex] === '') {
      startIndex++;
    }

    while (endIndex >= startIndex && results[endIndex] === '') {
      endIndex--;
    }

    if (startIndex > endIndex) return '';

    return results.slice(startIndex, endIndex + 1).join(separator);
  }

  /**
   * Converts an array of top-level TipTap nodes (block nodes).
   */
  convertBlocks(nodes: TipTapNode[], context: ConversionContext): string {
    const results = nodes.map((node) => this.convertBlockNode(node, context));
    return this.trimAndJoinResults(results, this.getBlockSeparator());
  }

  /**
   * Converts raw TipTap block data. Handles default description recursion guard.
   */
  convertRawBlocks(blocks: TipTapNode[], context: ConversionContext): string {
    const isDefaultDescription = blocks === context.defaultDescription;
    if (isDefaultDescription) {
      if (this.processingDefaultDescription) {
        return '';
      }
      this.processingDefaultDescription = true;
    }

    try {
      return this.convertBlocks(blocks, context);
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
   * Converts the `content` array of a block node.
   * Dispatches each child to the appropriate handler based on type.
   */
  protected convertContent(
    content: TipTapNode[] | undefined,
    context: ConversionContext,
  ): string {
    if (!content || content.length === 0) return '';

    return content
      .map((child) => {
        if (isTextNode(child)) {
          return this.convertTextNode(child, context);
        }
        if (InlineTypes.includes(child.type)) {
          return this.convertInlineNode(child, context);
        }
        // Nested block nodes (e.g., listItem content)
        return this.convertBlockNode(child, context);
      })
      .join('');
  }

  /**
   * Converts children blocks with increased depth.
   */
  protected convertChildren(
    children: TipTapNode[],
    context: ConversionContext,
  ): string {
    if (!children || children.length === 0) return '';

    this.currentDepth += 1;
    try {
      const results = children.map((child) =>
        this.convertBlockNode(child, context),
      );
      return this.trimAndJoinResults(results, this.getBlockSeparator());
    } finally {
      this.currentDepth -= 1;
    }
  }

  /**
   * Helper to check if a shortcut should be rendered for this website.
   */
  protected shouldRenderShortcut(
    node: TipTapNode,
    context: ConversionContext,
  ): boolean {
    const attrs = node.attrs ?? {};
    const onlyTo = (attrs.only?.split(',') ?? [])
      .map((s: string) => s.trim().toLowerCase())
      .filter((s: string) => s.length > 0);

    if (onlyTo.length === 0) return true;

    return onlyTo.includes(context.website.toLowerCase());
  }

  /**
   * Helper to resolve username shortcut link.
   */
  protected getUsernameShortcutLink(
    node: TipTapNode,
    context: ConversionContext,
  ):
    | {
        url: string;
        username: string;
      }
    | undefined {
    const attrs = node.attrs ?? {};
    const username = (attrs.username as string)?.trim() ?? '';

    let convertedUsername = username;
    let effectiveShortcutId = attrs.shortcut;

    const converted = context.usernameConversions?.get(username);
    if (converted && converted !== username) {
      convertedUsername = converted;
      effectiveShortcutId = context.website;
    }

    const shortcut: UsernameShortcut | undefined =
      context.shortcuts[effectiveShortcutId];
    const url =
      shortcut?.convert?.call(node, context.website, effectiveShortcutId) ??
      shortcut?.url;

    return convertedUsername && url
      ? {
          url: url.replace('$1', convertedUsername),
          username: convertedUsername,
        }
      : undefined;
  }
}

