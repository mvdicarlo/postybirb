import type {
  FieldLabelTranslations,
  FieldLabelTranslationsId,
} from '@postybirb/translations';
import { PrimitiveRecord } from './primitive-record';

export type FieldType<
  V,
  F extends string,
  T extends PrimitiveRecord | unknown = unknown,
> = {
  /**
   * Pulls a default value from a key property
   */
  defaultFrom?: keyof T;

  /**
   * The default value when populated.
   * This is also populated when the defaultFrom property is defined.
   * Can also be read from the value of a field set in the object i.e. `field = 'value'`.
   */
  defaultValue?: V;

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
   * The translation id of the label to display. All possible values can be found here: {@link FieldLabelTranslations}.
   */
  label: FieldLabelTranslationsId;

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

  /**
   * Whether the field should be hidden.
   */
  hidden?: boolean;

  /**
   * Allow derivation of a field from derived external data
   * Selects the key from the provided object and sets the populate field to that value.
   */
  derive?: {
    key: keyof T;
    populate: string;
  }[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showWhen?: Array<[keyof T, any[]]>;
};
