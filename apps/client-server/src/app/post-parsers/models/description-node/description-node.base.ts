import { UsernameShortcut } from '@postybirb/types';
import {
  IDescriptionBlockNode,
  IDescriptionNode,
} from './description-node.types';

// Forward declarations to avoid circular dependencies
export interface IDescriptionBlockNodeClass {
  type: string;
  props: Record<string, string>;
  id: string;
  content: unknown[];
}

export interface IDescriptionInlineNodeClass {
  type: string;
  props: Record<string, string>;
  content: unknown[];
  href?: string;
}

export interface IDescriptionTextNodeClass {
  type: string;
  props: Record<string, string>;
  text: string;
  styles: Record<string, string | boolean>;
}

/**
 * Context provided to all converters during conversion.
 */
export interface ConversionContext {
  website: string;
  shortcuts: Record<string, UsernameShortcut>;
  customShortcuts: Map<string, IDescriptionBlockNode[]>;
  defaultDescription: IDescriptionBlockNode[];
  title?: string;
  tags?: string[];
}

/**
 * Interface that all converters must implement.
 */
export interface NodeConverter<TOutput> {
  convertBlockNode(
    node: IDescriptionBlockNodeClass,
    context: ConversionContext,
  ): TOutput;
  convertInlineNode(
    node: IDescriptionInlineNodeClass,
    context: ConversionContext,
  ): TOutput;
  convertTextNode(
    node: IDescriptionTextNodeClass,
    context: ConversionContext,
  ): TOutput;
}

/**
 * Base class for description nodes - pure data structure.
 */
export abstract class DescriptionNode<Type = string>
  implements IDescriptionNode<Type>
{
  type: Type;

  props: Record<string, string>;

  constructor(node: IDescriptionNode<Type>) {
    this.type = node.type;
    this.props = node.props ?? {};
  }

  /**
   * Accept a visitor/converter pattern for traversal.
   */
  abstract accept<T>(
    converter: NodeConverter<T>,
    context: ConversionContext,
  ): T;
}
