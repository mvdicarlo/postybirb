import {
  ConversionContext,
  IDescriptionBlockNodeClass,
  IDescriptionInlineNodeClass,
  IDescriptionTextNodeClass,
} from '../description-node.base';
import { BaseConverter } from './base-converter';

export class PlainTextConverter extends BaseConverter {
  protected getBlockSeparator(): string {
    return '\r\n';
  }

  /**
   * Gets the current tab indentation prefix based on depth.
   */
  private getIndentPrefix(): string {
    if (this.currentDepth === 0) return '';
    return '\t'.repeat(this.currentDepth);
  }

  convertBlockNode(
    node: IDescriptionBlockNodeClass,
    context: ConversionContext,
  ): string {
    if (node.type === 'defaultShortcut') {
      return this.convertRawBlocks(context.defaultDescription, context);
    }

    if (node.type === 'divider') return '----------';

    // Skip media blocks
    if (
      node.type === 'image' ||
      node.type === 'video' ||
      node.type === 'audio'
    ) {
      return '';
    }

    const indent = this.getIndentPrefix();
    const content = (
      node.content as Array<
        IDescriptionInlineNodeClass | IDescriptionTextNodeClass
      >
    )
      .map((child) => {
        if (child.type === 'text') {
          return this.convertTextNode(
            child as IDescriptionTextNodeClass,
            context,
          );
        }
        return this.convertInlineNode(
          child as IDescriptionInlineNodeClass,
          context,
        );
      })
      .join('');

    let result = indent + content;

    // Process children with increased depth (tab indentation)
    if (node.children && node.children.length > 0) {
      const childrenText = this.convertChildren(node.children, context);
      if (childrenText) {
        result += this.getBlockSeparator() + childrenText;
      }
    }

    return result;
  }

  convertInlineNode(
    node: IDescriptionInlineNodeClass,
    context: ConversionContext,
  ): string {
    if (node.type === 'link') {
      const content = (node.content as IDescriptionTextNodeClass[])
        .map((child) => this.convertTextNode(child, context))
        .join('');
      return `${content}: ${node.href ?? node.props.href}`;
    }

    if (node.type === 'username') {
      if (!this.shouldRenderUsernameShortcut(node, context)) return '';

      const sc = this.getUsernameShortcutLink(node, context);
      return sc ? sc.url : '';
    }

    if (node.type === 'customShortcut') {
      const shortcutBlocks = context.customShortcuts.get(node.props.id);
      if (shortcutBlocks) {
        return this.convertRawBlocks(shortcutBlocks, context);
      }
      return '';
    }

    if (node.type === 'titleShortcut') {
      return context.title ?? '';
    }

    if (node.type === 'tagsShortcut') {
      return context.tags?.join(' ') ?? '';
    }

    if (node.type === 'contentWarningShortcut') {
      return context.contentWarningText ?? '';
    }

    return (node.content as IDescriptionTextNodeClass[])
      .map((child) => this.convertTextNode(child, context))
      .join('');
  }

  convertTextNode(
    node: IDescriptionTextNodeClass,
    context: ConversionContext,
  ): string {
    return node.text;
  }
}
