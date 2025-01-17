import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

type SelectOption = {
  label: string;
  value: string;
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
