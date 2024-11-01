/* eslint-disable no-param-reassign */
import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

type SelectOption = {
  label: string;
  value: unknown;
  options?: SelectOption[];
};

type ExtraOptions = {
  options: SelectOption[];
  allowMultiple: boolean;
};

export const SelectField = createFieldDecorator<unknown, ExtraOptions>(
  'select',
)({
  defaults: {
    formField: 'select',
    allowMultiple: false,
  },
});
