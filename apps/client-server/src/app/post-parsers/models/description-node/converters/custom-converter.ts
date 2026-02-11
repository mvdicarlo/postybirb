/* eslint-disable @typescript-eslint/no-explicit-any */
import { ConversionContext } from '../description-node.base';
import { TipTapNode } from '../description-node.types';
import { BaseConverter } from './base-converter';

export type CustomNodeHandler = (
  node: TipTapNode,
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
    node: TipTapNode,
    context: ConversionContext,
  ): string {
    return this.blockHandler(node, context);
  }

  convertInlineNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string {
    if (this.inlineHandler) {
      return this.inlineHandler(node, context);
    }
    return this.convertContent(node.content, context);
  }

  convertTextNode(
    node: TipTapNode,
    context: ConversionContext,
  ): string {
    if (this.textHandler) {
      return this.textHandler(node, context);
    }
    return (node as any).text ?? '';
  }
}

