import { UsernameShortcut } from '@postybirb/types';
import { ConversionContext } from '../description-node.base';
import { InlineTypes, isTextNode, TipTapNode } from '../description-node.types';

/**
 * Base converter for transforming TipTap JSON into a target output format.
 *
 * Processes TipTap nodes directly (no wrapper classes). Block-level nodes,
 * inline shortcut atoms, and text nodes each have dedicated abstract methods
 * that subclasses must implement.
 *
 * Conversion flow:
 * - `convert()` starts conversion of a node array and calls `convertBlocks()`
 * - Recursion uses `convertContent()` for node content and `convertChildren()` for nested blocks.
 * - A guard prevents infinite loops when processing the default description.
 */
export abstract class BaseConverter {
  /** Current nesting depth for hierarchical block formatting. */
  protected currentDepth = 0;

  /** Prevents infinite loops when processing the default description. */
  protected processingDefaultDescription = false;

  /**
   * Converts a block-level TipTap node (e.g., paragraph, heading, list).
   */
  abstract convertBlockNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string;

  /**
   * Converts an inline shortcut atom (e.g., mention, hashtag).
   */
  abstract convertInlineNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string;

  /**
   * Converts a plain text node.
   */
  abstract convertTextNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string;

  /**
   * Entry point for converting an array of TipTap nodes.
   *
   * The default implementation calls `convertBlocks()`. Subclasses may override
   * this method if they need to produce a different output type (e.g., a JSON
   * structure instead of a plain string).
   */
  convert(nodes: TipTapNode[], context: ConversionContext): string {
    return this.convertBlocks(nodes, context);
  }

  /**
   * Converts an array of block nodes.
   *
   * Handles the special case where the input is the default description,
   * preventing recursive reprocessing of the same content.
   */
  convertBlocks(nodes: TipTapNode[], context: ConversionContext): string {
    const isDefaultDescription = nodes === context.defaultDescription;
    if (isDefaultDescription) {
      if (this.processingDefaultDescription) {
        return '';
      }
      this.processingDefaultDescription = true;
    }

    try {
      const results = nodes.map((node) => this.convertBlockNode(node, context));
      return results.join(this.getBlockSeparator());
    } finally {
      if (isDefaultDescription) {
        this.processingDefaultDescription = false;
      }
    }
  }

  /**
   * Returns the string used to separate block-level nodes in the final output.
   */
  protected abstract getBlockSeparator(): string;

  /**
   * Converts the inline content of a block node.
   *
   * Handles text nodes, inline shortcuts, and nested blocks appropriately.
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
   * Converts child blocks, maintaining proper nesting.
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
      return results.join(this.getBlockSeparator());
    } finally {
      this.currentDepth -= 1;
    }
  }

  /**
   * Determines whether a shortcut should be rendered for the target website.
   *
   * If the shortcut has an `only` restriction, the website must be listed;
   * otherwise, the shortcut is always rendered.
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
   * Resolves a username shortcut into a URL and the final username.
   *
   * Applies any context-specific username conversion, then looks up the
   * corresponding shortcut definition. Returns `undefined` if the username
   * or the resolved URL is missing.
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
      // Use the shortcut ID registered for the target website so the
      // website-specific convert function (e.g. :icon$1: for FA) is invoked.
      // If the target website has no shortcut, keep the original shortcut so
      // the link still renders using the original URL template.
      const targetShortcutId =
        context.websiteToShortcutId?.[context.website];
      if (targetShortcutId && context.shortcuts[targetShortcutId]) {
        effectiveShortcutId = targetShortcutId;
      }
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
