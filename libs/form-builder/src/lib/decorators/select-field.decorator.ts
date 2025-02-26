import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

export type SelectOptionWithDiscriminator = {
  options: Record<string, SelectOption[]>;
  discriminator: 'overallFileType';
};

export type SelectOption =
  | {
      group: string;
      items: Array<{
        label: string;
        value: string;
      }>;
    }
  | {
      label: string;
      value: string;
    };

type ExtraOptions = {
  options: SelectOption[] | SelectOptionWithDiscriminator;
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
