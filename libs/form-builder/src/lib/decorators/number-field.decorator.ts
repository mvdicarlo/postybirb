import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

type ExtraOptions = {
  min?: number;
  max?: number;
};

export const NumberField = createFieldDecorator<number, ExtraOptions>('number')(
  {
    defaults: {
      formField: 'number',
    },
  },
);
