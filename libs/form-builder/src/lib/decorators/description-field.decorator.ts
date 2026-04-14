import {
  DefaultDescriptionValue,
  DescriptionType,
  DescriptionValue,
} from '@postybirb/types';
import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

type DescriptionExtraFields = {
  minDescriptionLength?: number;
  maxDescriptionLength?: number;
  descriptionType?: DescriptionType;

  /**
   * Whenether are expected to be included into the description as text or not.
   * If enabled it will enable "Insert title at start" by default and produce a warning if title is not included.
   * If disabled it will produce a warning if title was included.
   */
  expectsInlineTitle?: boolean;

  /**
   * Whenether tags are expected to be included into the description as text or not.
   * If enabled it will enable "Insert tags at end" by default and produce a warning if tags are not included.
   * If disabled it will produce a warning if tags were included.
   */
  expectsInlineTags?: boolean;
};

export const DescriptionField = createFieldDecorator<
  DescriptionValue,
  DescriptionExtraFields
>('description')({
  defaults: {
    label: 'description',
    formField: 'description',
    defaultValue: DefaultDescriptionValue(),
    descriptionType: DescriptionType.HTML as DescriptionType, // otherwise aggregatefield type will treat it as html only,
  },
  onCreate(options) {
    const { defaultValue } = options;
    if (defaultValue) {
      defaultValue.insertTags = options.expectsInlineTitle;
      defaultValue.insertTitle = options.expectsInlineTags;
    }
  },
});
