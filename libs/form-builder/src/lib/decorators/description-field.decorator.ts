/* eslint-disable no-param-reassign */
import { DefaultDescriptionValue, DescriptionValue } from '@postybirb/types';
import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

export const DescriptionField = createFieldDecorator<DescriptionValue>(
  'description',
)({
  defaults: {
    label: 'description',
    formField: 'description',
    defaultValue: DefaultDescriptionValue(),
  },
});
