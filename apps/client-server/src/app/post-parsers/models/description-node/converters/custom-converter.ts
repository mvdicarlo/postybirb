import {
    ConversionContext,
    IDescriptionBlockNodeClass,
    IDescriptionInlineNodeClass,
    IDescriptionTextNodeClass,
} from '../description-node.base';
import { BaseConverter } from './base-converter';

export type CustomNodeHandler = (
  node:
    | IDescriptionBlockNodeClass
    | IDescriptionInlineNodeClass
    | IDescriptionTextNodeClass,
  context: ConversionContext,
) => string;

/**
 * Converter that uses custom handlers for each node type.
 * This allows websites like Tumblr to inject their own conversion logic.
 */
export class CustomConverter extends BaseConverter {
  constructor(
    private readonly blockHandler: CustomNodeHandler,
    private readonly inlineHandler?: CustomNodeHandler,
    private readonly textHandler?: CustomNodeHandler,
  ) {
    super();
  }

  protected getBlockSeparator(): string {
    return '\n';
  }

  convertBlockNode(
    node: IDescriptionBlockNodeClass,
    context: ConversionContext,
  ): string {
    return this.blockHandler(node, context);
  }

  convertInlineNode(
    node: IDescriptionInlineNodeClass,
    context: ConversionContext,
  ): string {
    if (this.inlineHandler) {
      return this.inlineHandler(node, context);
    }
    // Default: just concatenate children
    return (node.content as IDescriptionTextNodeClass[])
      .map((child) => this.convertTextNode(child, context))
      .join('');
  }

  convertTextNode(
    node: IDescriptionTextNodeClass,
    context: ConversionContext,
  ): string {
    if (this.textHandler) {
      return this.textHandler(node, context);
    }
    return node.text;
  }
}
