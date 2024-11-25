import {
  BooleanField,
  DescriptionField,
  RadioField,
  RatingField,
  SelectField,
  TagField,
  TextField,
} from '../decorators';
import { ExtractFieldTypeFromDecorator } from '../utils/assign-metadata';

export type RatingFieldType = ExtractFieldTypeFromDecorator<typeof RatingField>;
export type TagFieldType = ExtractFieldTypeFromDecorator<typeof TagField>;
export type DescriptionFieldType = ExtractFieldTypeFromDecorator<
  typeof DescriptionField
>;
export type TextFieldType = ExtractFieldTypeFromDecorator<typeof TextField>;
export type SelectFieldType = ExtractFieldTypeFromDecorator<typeof SelectField>;
export type BooleanFieldType = ExtractFieldTypeFromDecorator<
  typeof BooleanField
>;
export type RadioFieldType = ExtractFieldTypeFromDecorator<typeof RadioField>;

export type FieldAggregateType =
  | BooleanFieldType
  | TextFieldType
  | RadioFieldType
  | RatingFieldType
  | TagFieldType
  | DescriptionFieldType
  | SelectFieldType;
