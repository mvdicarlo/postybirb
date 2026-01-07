import {
  ConversionContext,
  IDescriptionBlockNodeClass,
  IDescriptionInlineNodeClass,
  IDescriptionTextNodeClass,
} from '../description-node.base';
import { BaseConverter } from './base-converter';

export class BBCodeConverter extends BaseConverter {
  protected getBlockSeparator(): string {
    return '\n';
  }

  convertBlockNode(
    node: IDescriptionBlockNodeClass,
    context: ConversionContext,
  ): string {
    if (node.type === 'defaultShortcut') {
      return this.convertRawBlocks(context.defaultDescription, context);
    }

    if (node.type === 'divider') return '[hr]';

    // Media blocks not supported in BBCode
    if (
      node.type === 'image' ||
      node.type === 'video' ||
      node.type === 'audio'
    ) {
      return '';
    }

    if (node.type === 'paragraph') {
      let text = (
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

      if (node.props.textColor && node.props.textColor !== 'default') {
        text = `[color=${node.props.textColor}]${text}[/color]`;
      }
      return text;
    }

    if (node.type === 'heading') {
      const { level } = node.props;
      let text = `[h${level}]${(
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
        .join('')}[/h${level}]`;

      if (node.props.textColor && node.props.textColor !== 'default') {
        text = `[color=${node.props.textColor}]${text}[/color]`;
      }
      return text;
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
    if (!node.content.length && node.type !== 'customShortcut') return '';

    if (node.type === 'link') {
      const content = (node.content as IDescriptionTextNodeClass[])
        .map((child) => this.convertTextNode(child, context))
        .join('');
      return `[url=${node.href ?? node.props.href}]${content}[/url]`;
    }

    if (node.type === 'username') {
      if (!this.shouldRenderUsernameShortcut(node, context)) return '';

      const sc = this.getUsernameShortcutLink(node, context);
      if (sc?.url.startsWith('http')) {
        return `[url=${sc.url}]${sc.username}[/url]`;
      }
      return sc ? `${sc.url ?? sc.username}` : '';
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
    if (!node.text) return '';

    // Handle line breaks from merged blocks
    if (node.text === '\n' || node.text === '\r\n') {
      return '[br]';
    }

    const segments: string[] = [];

    if (node.styles.bold) segments.push('b');
    if (node.styles.italic) segments.push('i');
    if (node.styles.underline) segments.push('u');
    if (node.styles.strike) segments.push('s');

    if (!segments.length) {
      return node.text;
    }

    const text = node.text.replace(/\n/g, '[br]');
    let segmentedText = `[${segments.join('')}]${text}[/${segments
      .reverse()
      .join('')}]`;

    if (node.styles.textColor && node.styles.textColor !== 'default') {
      segmentedText = `[color=${node.styles.textColor}]${segmentedText}[/color]`;
    }

    return segmentedText;
  }
}
