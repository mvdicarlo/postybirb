import {
  BooleanField,
  DateTimeField,
  DescriptionField,
  RadioField,
  RatingField,
  SelectField,
  TagField,
  TextField,
  TitleField,
} from '../decorators';
import { ExtractFieldTypeFromDecorator } from '../utils/assign-metadata';

export type RatingFieldType = ExtractFieldTypeFromDecorator<typeof RatingField>;
export type TagFieldType = ExtractFieldTypeFromDecorator<typeof TagField>;
export type DescriptionFieldType = ExtractFieldTypeFromDecorator<
  typeof DescriptionField
>;
export type TextFieldType = ExtractFieldTypeFromDecorator<typeof TextField>;
export type TitleFieldType = ExtractFieldTypeFromDecorator<typeof TitleField>;
export type SelectFieldType = ExtractFieldTypeFromDecorator<typeof SelectField>;
export type BooleanFieldType = ExtractFieldTypeFromDecorator<
  typeof BooleanField
>;
export type RadioFieldType = ExtractFieldTypeFromDecorator<typeof RadioField>;
export type DateTimeFieldType = ExtractFieldTypeFromDecorator<
  typeof DateTimeField
>;

export type FieldAggregateType =
  | BooleanFieldType
  | DateTimeFieldType
  | TextFieldType
  | RadioFieldType
  | RatingFieldType
  | TagFieldType
  | DescriptionFieldType
  | SelectFieldType
  | TitleFieldType;
