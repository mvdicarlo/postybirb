import { TipTapNode } from '@postybirb/types';
import { MarkdownConverter } from '../../../post-parsers/models/description-node/converters/markdown-converter';
import { ConversionContext } from '../../../post-parsers/models/description-node/description-node.base';

export class DiscordDescriptionConverter extends MarkdownConverter {
  convert(nodes: TipTapNode[], context: ConversionContext): string {
    let markdown = super.convert(nodes, context);

    // Discord does not recognize links that have display text same as the link itself, like [https://example.com](https://example.com)
    // use https://example.com instead
    markdown = markdown.replace(
      /\[([^\]]+)\]\(([^)]+)\)/gm,
      (original, link, text) => (link === text ? link : original),
    );

    // Don't escape _ in emojis
    markdown = markdown.replace(/:[^:]+_[^:]+:/gm, (emoji: string) =>
      emoji.replaceAll('\\_', '_'),
    );

    return markdown;
  }
}
