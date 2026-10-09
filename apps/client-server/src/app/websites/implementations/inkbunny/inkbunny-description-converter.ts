import { TipTapNode } from '@postybirb/types';
import { BBCodeConverter } from '../../../post-parsers/models/description-node/converters/bbcode-converter';
import { ConversionContext } from '../../../post-parsers/models/description-node/description-node.base';

export class InkbunnyConverter extends BBCodeConverter {
  convertBlockNode(node: TipTapNode, context: ConversionContext): string {
    const attrs = node.attrs ?? {};

    if (node.type === 'heading') {
      const rawLevel: number = attrs.level ?? 1;
      const postyBirbToInkBunnyLevelMapping = {
        '1': 3,
        '2': 2,
        '3': 1,
      } as Record<number, number>;
      const level = postyBirbToInkBunnyLevelMapping[rawLevel] ?? 1;

      const text = `${'[t]'.repeat(level)}${this.convertContent(node.content, context)}${'[/t]'.repeat(level)}`;

      return this.withAlignAndIndentation(node, text);
    }

    return super.convertBlockNode(node, context);
  }
}
