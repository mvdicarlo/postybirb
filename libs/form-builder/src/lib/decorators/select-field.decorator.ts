import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

export type SelectOptionWithDiscriminator = {
  options: Record<string, SelectOption[]>;
  discriminator: 'overallFileType';
};

export interface SelectOptionGrouped {
  group: string;
  items: SelectOptionSingle[];
}

export interface SelectOptionSingle {
  label: string;
  value: string;
}

export type SelectOption = SelectOptionGrouped | SelectOptionSingle;

type ExtraOptions = {
  options: SelectOption[] | SelectOptionWithDiscriminator;
  allowMultiple: boolean;
  minSelected?: number;
};

export const SelectField = createFieldDecorator<unknown, ExtraOptions>(
  'select',
)({
  defaults: {
    formField: 'select',
    allowMultiple: false,
  },
});
