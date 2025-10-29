import {
  ConversionContext,
  DescriptionNode,
  IDescriptionBlockNodeClass,
  NodeConverter,
} from './description-node.base';
import {
  BlockTypes,
  IDescriptionBlockNode,
  IDescriptionInlineNode,
  IDescriptionTextNode,
  InlineTypes,
} from './description-node.types';
import { DescriptionInlineNode } from './inline-description-node';
import { DescriptionTextNode } from './text-description-node';

export class DescriptionBlockNode
  extends DescriptionNode<IDescriptionBlockNode['type']>
  implements IDescriptionBlockNode, IDescriptionBlockNodeClass
{
  id: string;

  content: Array<DescriptionInlineNode | DescriptionTextNode>;

  constructor(node: IDescriptionBlockNode) {
    super(node);
    this.id = node.id;
    this.content =
      node.content?.map((child) => {
        if (BlockTypes.includes(child.type)) {
          throw new Error('Block nodes cannot contain other block nodes');
        } else if (child.type === 'text') {
          return new DescriptionTextNode(child as IDescriptionTextNode);
        } else if (InlineTypes.includes(child.type)) {
          return new DescriptionInlineNode(child as IDescriptionInlineNode);
        }
        throw new Error(`Unknown node type: ${child.type}`);
      }) ?? [];
  }

  accept<T>(converter: NodeConverter<T>, context: ConversionContext): T {
    return converter.convertBlockNode(this, context);
  }
}
