import { FieldTranslationId } from '@postybirb/types';
import { PrimitiveRecord } from './primitive-record';

// eslint-disable-next-line @nrwl/nx/enforce-module-boundaries, @typescript-eslint/no-unused-vars, import/order
import { type fieldLabelTranslations } from 'apps/postybirb-ui/src/components/form/fields/field-translations';

export type FieldType<
  V,
  F extends string,
  T extends PrimitiveRecord | unknown = unknown
> = {
  /**
   * Pulls a default value from a key property
   */
  defaultFrom?: keyof T;

  /**
   * The default value when populated
   */
  defaultValue: V;

  /**
   * The field will be enabled when all listed props are defined.
   */
  enableWhenDefined?: Array<keyof T>;

  /**
   * The field will be enabled when all the listed props are undefined.
   */
  enableWhenUndefined?: Array<keyof T>;

  /**
   * Metadata for determining what type of field to generate.
   */
  formField?: F;

  /**
   * The translation id of the label to display. All possible values can be found here: {@link fieldLabelTranslations}.
   */
  label: FieldTranslationId;

  /**
   * Whether the field is considered required.
   */
  required?: boolean;

  /**
   * Metadata type.
   */
  type?: string;

  /**
   * Whether the component should grow to fill the available space.
   */
  grow?: boolean;

  /**
   * The row in the grid.
   */
  row?: number;

  /**
   * The column in the grid.
   */
  col?: number;
};
