// eslint-typescript doesn't counts @link as a var use. We use it
// to make jump-to definitions and to simplify DX
/* eslint-disable @typescript-eslint/no-unused-vars */

import { FieldTranslationId, FieldTranslations } from '@postybirb/types';
import { PrimitiveRecord } from './primitive-record';

type Translations =
  typeof import('apps/postybirb-ui/src/components/translations/field-translations');

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
   * The translation id of the label to display. All possible values can be found here: {@link Translations.fieldLabelTranslations|fieldLabelTranslations} and here: {@link FieldTranslations}.
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
};
