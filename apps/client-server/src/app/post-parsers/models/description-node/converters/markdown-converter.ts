import { TipTapNode } from '@postybirb/types';
import TurndownService from 'turndown';
import { ConversionContext } from '../description-node.base';
import { HtmlConverter } from './html-converter';

export class MarkdownConverter extends HtmlConverter {
  protected createConverter(turndownInstance = new TurndownService()) {
    turndownInstance.addRule('nestedIndent', {
      filter: (node) =>
        node.nodeName === 'DIV' &&
        node.getAttribute('style')?.includes('margin-left'),
      replacement: (content) =>
        `\n\n> ${content.trim().replace(/\n/g, '\n> ')}\n\n`,
    });

    return turndownInstance;
  }

  convert(nodes: TipTapNode[], context: ConversionContext): string {
    const converter = this.createConverter();
    const html = super.convert(nodes, context);

    return converter.turndown(html);
  }
}
