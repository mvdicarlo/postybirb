import { Primitive } from 'type-fest';

type ValidValue = Primitive | Primitive[];

export type PrimitiveRecord<
  T extends Record<string, ValidValue> = Record<string, ValidValue>,
> = T;
