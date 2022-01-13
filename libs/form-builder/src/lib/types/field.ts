import { Primitive } from 'type-fest';
import { PrimitiveRecord } from './primitive-record';

export type FieldType<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
