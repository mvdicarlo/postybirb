import { TipTapNode } from '@postybirb/types';
import { HTMLParser as HTMLToTelegram } from 'teleproto/extensions/html';
import { HtmlConverter } from '../../../post-parsers/models/description-node/converters/html-converter';
import { ConversionContext } from '../../../post-parsers/models/description-node/description-node.base';

export class TelegramConverter extends HtmlConverter {
  protected getBlockSeparator(): string {
    return '<br>';
  }

  convert(nodes: TipTapNode[], context: ConversionContext): string {
    let html = super.convert(nodes, context);

    html = html.replaceAll('<hr>', '<span>————————</span>');

    // Used for description preview
    const rendered = HTMLToTelegram.unparse(
      ...TelegramConverter.fromHtml(html),
    ).replaceAll('\n', '<br>');

    return JSON.stringify({
      html,
      rendered,
    });
  }

  static fromJson(json: string) {
    const { html } = JSON.parse(json) as { html: string };

    return TelegramConverter.fromHtml(html);
  }

  private static fromHtml(html: string) {
    return HTMLToTelegram.parse(html.replaceAll('<br>', '\n'));
  }
}
