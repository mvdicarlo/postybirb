import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

export type SelectOptionWithDiscriminator = {
  options: Record<string, SelectOption[]>;
  discriminator: 'overallFileType';
};

export type SelectOptionSingle = {
  label: string;
  value: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  mutuallyExclusive?: boolean; // Deselect all others when true and chosen
};

export type SelectOptionGroup = {
  label: string;
  value?: string;
  items: SelectOption[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  mutuallyExclusive?: boolean; // Deselect all others when true and chosen
};

export type SelectOption = SelectOptionGroup | SelectOptionSingle;

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
