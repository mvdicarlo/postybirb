import { UsernameShortcut } from '@postybirb/types';
import { IDescriptionNode } from './description-node.types';

export abstract class DescriptionNode<Type = string>
  implements IDescriptionNode<Type>
{
  type: Type;

  props: Record<string, string>;

  shortcuts: Record<string, UsernameShortcut>;

  constructor(
    node: IDescriptionNode<Type>,
    shortcuts: Record<string, UsernameShortcut>,
  ) {
    this.type = node.type;
    this.props = node.props ?? {};
    this.shortcuts = shortcuts;
  }

  abstract toHtmlString(): string;

  abstract toString(): string;
}
