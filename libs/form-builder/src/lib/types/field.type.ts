import { Primitive } from 'type-fest';

export type FieldType<
  T extends Record<string, Primitive>,
  V extends Primitive,
  F extends string
> = {
  defaultFrom?: keyof T;
  defaultValue: V;
  enableWhenDefined?: Array<keyof T>;
  enableWhenUndefined?: Array<keyof T>;
  formField?: F;
  label: string;
  required?: boolean;
  type?: string;
};
