import { Primitive } from 'type-fest';

export type PrimitiveRecord<
  T extends Record<string, Primitive> = Record<string, Primitive>
> = T;
