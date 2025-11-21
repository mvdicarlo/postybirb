/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
/* eslint-disable @typescript-eslint/no-unused-vars */

import {
    ConversionContext,
    DescriptionNode,
    IDescriptionTextNodeClass,
    NodeConverter,
} from './description-node.base';
import { IDescriptionTextNode, Styles } from './description-node.types';

export class DescriptionTextNode
  extends DescriptionNode<IDescriptionTextNode['type']>
  implements IDescriptionTextNode, IDescriptionTextNodeClass
{
  text: string;

  styles: Styles;

  constructor(node: IDescriptionTextNode) {
    super(node);
    this.text = node.text ?? '';
    this.styles = node.styles ?? {};
  }

  accept<T>(converter: NodeConverter<T>, context: ConversionContext): T {
    return converter.convertTextNode(this, context);
  }
}
