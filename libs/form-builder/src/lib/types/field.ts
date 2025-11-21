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
   * The translation id of the label to display. All possible values can be found here: {@link FieldLabelTranslations}. Use `{ untranslated: string }` **ONLY** if it is difficult to translate the label and the website itself does not provide a translation for it, or if it is NSFW/offensive and should not be shown in public translations.
   */
  label:
    | FieldLabelTranslationsId
    | {
        /**
         * Use **ONLY** if it is difficult to translate the label and the website itself does not provide a translation for it, or if it is NSFW/offensive and should not be shown in public translations.
         */
        untranslated: string;
      };

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
   * @deprecated Use span instead
   */
  grow?: boolean;

  /**
   * Whether the field should be hidden.
   */
  hidden?: boolean;

  // New section-based layout properties
  /**
   * The section this field belongs to for layout purposes
   * Well-known sections: 'common', 'website', others will be grouped below
   */
  section?: 'common' | 'website' | string;

  /**
   * Priority/order within the section (lower numbers appear first)
   */
  order?: number;

  /**
   * Column span in 12-column grid (1-12)
   * @default 12 (full width)
   */
  span?: number;

  /**
   * Offset from left in columns (0-11)
   */
  offset?: number;

  /**
   * Responsive column spans for different breakpoints
   */
  responsive?: {
    xs?: number; // mobile
    sm?: number; // tablet
    md?: number; // desktop
    lg?: number; // large desktop
  };

  /**
   * Whether the field should break to a new row
   */
  breakRow?: boolean;

  /**
   * Allow derivation of a field from derived external data
   * Selects the key from the provided object and sets the populate field to that value.
   */
  derive?: {
    key: keyof T;
    populate: string;
  }[];

  /**
   * Shows in the UI when all properties are satisfied.
   * Evaluates in field.tsx
   * @type {Array<[keyof T, any[]]>}
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  showWhen?: Array<[keyof T, any[]]>;
};
