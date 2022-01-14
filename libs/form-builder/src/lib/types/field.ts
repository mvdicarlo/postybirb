import { Primitive } from 'type-fest';
import { PrimitiveRecord } from './primitive-record';

export type FieldType<
  T extends PrimitiveRecord,
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
