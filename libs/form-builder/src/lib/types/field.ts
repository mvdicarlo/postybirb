import { PrimitiveRecord } from './primitive-record';

export type FieldType<T extends PrimitiveRecord, V, F extends string> = {
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
   * The label to display for the field.
   */
  label: string;

  /**
   * Translation label (wip)
   */
  i18nLabel?: string;

  /**
   * Whether the field is considered required.
   */
  required?: boolean;

  /**
   * Metadata type.
   */
  type?: string;

  /**
   * Display row.
   */
  row?: number;

  /**
   * Display column.
   */
  column?: number;

  /**
   * Whether or not the field should grow in side for display purposes.
   */
  grow?: boolean;
};
