import type {
  FieldLabelTranslations,
  FieldLabelTranslationsId,
} from '@postybirb/translations';
import { FormBuilderMetadata } from './index';
import { PrimitiveRecord } from './primitive-record';

export interface FieldType<
  V,
  F extends string,
  T extends PrimitiveRecord | unknown = unknown,
> {
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
   * Allow derivation of a field from derived website account data (NOT OPTIONS OR OTHER FIELDS)
   * Selects the key from website account data and sets the populate field inside these options to that value.
   *
   * @example
   * ```js
   * export type WebsiteAccountData = {
   *    galleryFolders: SelectOption[];
   * };
   *
   *
   *  derive: [
   *    {
   *      key: 'galleryFolders',
   *      populate: 'options',
   *    },
   *  ],
   *  options: [],
   * ```
   */
  derive?: {
    key: keyof T;
    populate: string;
  }[];

  /** Allows derivation of a field options from arbitrary data, e.g. options or other fields */
  customDerive?(this: this, fields: FormBuilderMetadata, options: T): void;

  /**
   * Shows in the UI when all properties are satisfied. Each property can have multiple alloved options
   * Evaluates in field.tsx
   *
   * @example showWhen: [['sensitiveContent', [true]]] // shows field when sensitiveContent is set to true
   */
  showWhen?: Array<[field: keyof T, allowedOptions: unknown[]]>;
}
