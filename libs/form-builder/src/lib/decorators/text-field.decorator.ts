import 'reflect-metadata';
import { createFieldDecorator } from '../utils/assign-metadata';

type ExtraOptions = {
  maxLength?: number;
  formField: 'input' | 'textarea';
};

export const TextField = createFieldDecorator<string, ExtraOptions>('text')({
  defaults: {
    defaultValue: '',
    formField: 'input',
  },
});
