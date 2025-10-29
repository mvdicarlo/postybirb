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

  /**
   * Converts an array of block nodes.
   */
  convertBlocks(
    nodes: AcceptableBlockNode[],
    context: ConversionContext,
  ): string {
    return nodes
      .map((node) => node.accept(this, context))
      .filter((result) => result !== '')
      .join(this.getBlockSeparator());
  }

  /**
   * Converts raw block data to nodes and then converts them.
   */
  convertRawBlocks(
    blocks: IDescriptionBlockNode[],
    context: ConversionContext,
  ): string {
    // Import locally to avoid circular dependency
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { DescriptionBlockNode } = require('../block-description-node');
    const nodes = blocks.map((block) => new DescriptionBlockNode(block));
    return this.convertBlocks(nodes, context);
  }

  /**
   * Returns the separator to use between blocks.
   */
  protected abstract getBlockSeparator(): string;

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
    const username = (node.content as IDescriptionTextNodeClass[])
      .map((child) => child.text)
      .join('')
      .trim();
    const shortcut: UsernameShortcut | undefined =
      context.shortcuts[node.props.shortcut];
    const url =
      shortcut?.convert?.call(node, context.website, node.props.shortcut) ??
      shortcut?.url;
    return username && url
      ? { url: url.replace('$1', username), username }
      : undefined;
  }
}
