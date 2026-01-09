import { DescriptionSchema } from '../../schemas/description-schema';

export interface IDescriptionNode<Type = string> {
  type: Type;
  props: Record<string, string>;
}

export type BlockType = keyof typeof DescriptionSchema.blockSchema;
export interface IDescriptionBlockNode extends IDescriptionNode<BlockType> {
  id: string;
  content: Array<IDescriptionInlineNode | IDescriptionTextNode>;
  children?: Array<IDescriptionBlockNode>;
}

export type InlineType = keyof typeof DescriptionSchema.inlineContentSchema;
export interface IDescriptionInlineNode extends IDescriptionNode<InlineType> {
  content: Array<IDescriptionTextNode>;
  href?: string;
}

export type Styles = Partial<{
  [key in keyof typeof DescriptionSchema.styleSchema]: string | boolean;
}>;

export interface IDescriptionTextNode extends IDescriptionNode<'text'> {
  text: string;
  styles: Styles;
}

export type ShortcutEnabledFields = {
  defaultDescription?: string;
  title?: string;
  tags?: string[];
};

export const BlockTypes = Object.keys(DescriptionSchema.blockSchema);
export const InlineTypes = Object.keys(DescriptionSchema.inlineContentSchema);
