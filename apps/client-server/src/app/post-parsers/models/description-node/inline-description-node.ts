import {
  ConversionContext,
  DescriptionNode,
  IDescriptionInlineNodeClass,
  NodeConverter,
} from './description-node.base';
import {
  IDescriptionInlineNode,
  IDescriptionTextNode,
} from './description-node.types';
import { DescriptionTextNode } from './text-description-node';

export class DescriptionInlineNode
  extends DescriptionNode<IDescriptionInlineNode['type']>
  implements IDescriptionInlineNode, IDescriptionInlineNodeClass
{
  content: DescriptionTextNode[];

  href?: string;

  constructor(node: IDescriptionInlineNode) {
    super(node);
    this.href = node.href;
    this.content =
      node?.content?.map((child) => {
        if (child.type === 'text') {
          return new DescriptionTextNode(child as IDescriptionTextNode);
        }
        throw new Error('Inline nodes can only contain text nodes');
      }) ?? [];
  }

  accept<T>(converter: NodeConverter<T>, context: ConversionContext): T {
    return converter.convertInlineNode(this, context);
  }
}
