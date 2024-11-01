/* eslint-disable no-param-reassign */
import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

export const BooleanField = createFieldDecorator<boolean>('boolean')({
  defaults: {
    formField: 'checkbox',
  },
});
