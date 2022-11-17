import { BooleanFieldType, RadioFieldType, TextFieldType } from '../decorators';
import { TagFieldType } from '../decorators/tag-field.decorator';
import { PrimitiveRecord } from './primitive-record';

export type FieldAggregateType<T extends PrimitiveRecord> =
  | BooleanFieldType<T>
  | TextFieldType<T>
  | RadioFieldType<T>
  | TagFieldType<T>;
