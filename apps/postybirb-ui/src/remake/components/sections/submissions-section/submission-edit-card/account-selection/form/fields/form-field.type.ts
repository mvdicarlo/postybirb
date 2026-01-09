/**
 * Form field types for the remake form system.
 */

import type { FieldAggregateType } from '@postybirb/form-builder';

export interface FormFieldProps<
  T extends FieldAggregateType = FieldAggregateType,
> {
  /** The name/key of the field in the form data */
  fieldName: string;
  /** The field metadata from form-builder */
  field: T;
}
