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

/** Maximum nesting depth for block children to prevent stack overflow */
const MAX_CHILDREN_DEPTH = 50;

export class DescriptionBlockNode
  extends DescriptionNode<IDescriptionBlockNode['type']>
  implements IDescriptionBlockNode, IDescriptionBlockNodeClass
{
  id: string;

  content: Array<DescriptionInlineNode | DescriptionTextNode>;

  children: DescriptionBlockNode[];

  constructor(node: IDescriptionBlockNode, depth = 0) {
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

    // Process children recursively with depth limit
    if (depth >= MAX_CHILDREN_DEPTH) {
      // eslint-disable-next-line no-console
      console.warn(
        `Maximum nesting depth (${MAX_CHILDREN_DEPTH}) exceeded, truncating children`,
      );
      this.children = [];
    } else {
      this.children =
        node.children?.map((child) => {
          if (!BlockTypes.includes(child.type)) {
            throw new Error(
              `Children must be block nodes, got: ${child.type}`,
            );
          }
          return new DescriptionBlockNode(child, depth + 1);
        }) ?? [];
    }
  }

  accept<T>(converter: NodeConverter<T>, context: ConversionContext): T {
    return converter.convertBlockNode(this, context);
  }
}
