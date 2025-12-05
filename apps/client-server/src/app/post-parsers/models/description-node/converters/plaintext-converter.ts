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

    return (
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
